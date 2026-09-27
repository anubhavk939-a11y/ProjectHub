import { Router } from 'express';
import { z } from 'zod';
import { GoogleGenAI } from '@google/genai';

import { prisma } from '../utils/prisma.js';
import { auth } from '../middleware/auth.js';

const router = Router();

const projectSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(10).max(2000),
  category: z.string().min(2).max(60),
  skills: z.array(z.string()).min(1).max(20),
  maxMembers: z.number().int().min(2).max(20)
});

const messageSchema = z.object({
  content: z.string().trim().min(1).max(2000)
});

const aiSchema = z.object({
  question: z.string().trim().min(2).max(2000)
});

function getGeminiClient() {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }

  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
  });

}

async function isProjectMember(projectId, userId) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true }
  });

  if (!project) return false;

  if (project.ownerId === userId) {
    return true;
  }

  const application = await prisma.application.findFirst({
    where: {
      projectId,
      userId,
      status: 'ACCEPTED'
    }
  });

  return Boolean(application);
}

/* =========================================================
   GET ALL PROJECTS
========================================================= */

router.get('/', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim();

    const projects = await prisma.project.findMany({
      where: q
        ? {
            OR: [
              {
                title: {
                  contains: q,
                  mode: 'insensitive'
                }
              },
              {
                description: {
                  contains: q,
                  mode: 'insensitive'
                }
              },
              {
                category: {
                  contains: q,
                  mode: 'insensitive'
                }
              }
            ]
          }
        : {},
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            college: true
          }
        },
        applications: {
          where: {
            status: 'ACCEPTED'
          },
          select: {
            userId: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(
      projects.map((project) => ({
        ...project,
        members: project.applications.length + 1
      }))
    );
  } catch (error) {
    next(error);
  }
});

/* =========================================================
   CREATE PROJECT
========================================================= */

router.post('/', auth, async (req, res, next) => {
  try {
    const data = projectSchema.parse(req.body);

    const project = await prisma.project.create({
      data: {
        title: data.title,
        description: data.description,
        category: data.category,
        skills: data.skills,
        maxMembers: data.maxMembers,
        ownerId: req.user.id
      }
    });

    res.status(201).json(project);
  } catch (error) {
    next(error);
  }
});

/* =========================================================
   GET PROJECT DETAILS
========================================================= */

router.get('/:id', async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: {
        id: req.params.id
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            college: true,
            bio: true,
            skills: true,
            githubUrl: true,
            linkedinUrl: true
          }
        },
        applications: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                college: true,
                skills: true,
                bio: true,
                githubUrl: true,
                linkedinUrl: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!project) {
      return res.status(404).json({
        error: 'Project not found'
      });
    }

    res.json(project);
  } catch (error) {
    next(error);
  }
});

/* =========================================================
   APPLY TO PROJECT
========================================================= */

router.post('/:id/apply', auth, async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: {
        id: req.params.id
      },
      include: {
        applications: {
          where: {
            status: 'ACCEPTED'
          }
        }
      }
    });

    if (!project) {
      return res.status(404).json({
        error: 'Project not found'
      });
    }

    if (project.ownerId === req.user.id) {
      return res.status(400).json({
        error: 'You own this project'
      });
    }

    const currentMembers = project.applications.length + 1;

    if (currentMembers >= project.maxMembers) {
      return res.status(400).json({
        error: 'This project is already full'
      });
    }

    const existing = await prisma.application.findUnique({
      where: {
        projectId_userId: {
          projectId: project.id,
          userId: req.user.id
        }
      }
    });

    if (existing) {
      return res.status(409).json({
        error: 'You already applied'
      });
    }

    const application = await prisma.application.create({
      data: {
        projectId: project.id,
        userId: req.user.id,
        message: String(req.body?.message || '')
      }
    });

    res.status(201).json(application);
  } catch (error) {
    next(error);
  }
});

/* =========================================================
   ACCEPT / REJECT APPLICATION
========================================================= */

router.patch(
  '/:id/applications/:applicationId',
  auth,
  async (req, res, next) => {
    try {
      const project = await prisma.project.findUnique({
        where: {
          id: req.params.id
        },
        include: {
          applications: {
            where: {
              status: 'ACCEPTED'
            }
          }
        }
      });

      if (!project) {
        return res.status(404).json({
          error: 'Project not found'
        });
      }

      if (project.ownerId !== req.user.id) {
        return res.status(403).json({
          error: 'Only the project owner can manage applications'
        });
      }

      const status = z
        .enum(['ACCEPTED', 'REJECTED'])
        .parse(req.body.status);

      const application = await prisma.application.findUnique({
        where: {
          id: req.params.applicationId
        }
      });

      if (
        !application ||
        application.projectId !== project.id
      ) {
        return res.status(404).json({
          error: 'Application not found'
        });
      }

      if (status === 'ACCEPTED') {
        const alreadyAccepted = project.applications.length;

        if (alreadyAccepted + 1 >= project.maxMembers) {
          return res.status(400).json({
            error: `This project already has the maximum of ${project.maxMembers} members`
          });
        }
      }

      const updatedApplication =
        await prisma.application.update({
          where: {
            id: application.id
          },
          data: {
            status
          }
        });

      res.json(updatedApplication);
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   GET PROJECT CHAT MESSAGES
========================================================= */

router.get('/:id/messages', auth, async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: {
        id: req.params.id
      }
    });

    if (!project) {
      return res.status(404).json({
        error: 'Project not found'
      });
    }

    const allowed = await isProjectMember(
      req.params.id,
      req.user.id
    );

    if (!allowed) {
      return res.status(403).json({
        error: 'You are not a member of this project'
      });
    }

    const messages = await prisma.message.findMany({
      where: {
        projectId: req.params.id
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            college: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    res.json(messages);
  } catch (error) {
    next(error);
  }
});

/* =========================================================
   SEND PROJECT CHAT MESSAGE
========================================================= */

router.post('/:id/messages', auth, async (req, res, next) => {
  try {
    const data = messageSchema.parse(req.body);

    const project = await prisma.project.findUnique({
      where: {
        id: req.params.id
      }
    });

    if (!project) {
      return res.status(404).json({
        error: 'Project not found'
      });
    }

    const allowed = await isProjectMember(
      req.params.id,
      req.user.id
    );

    if (!allowed) {
      return res.status(403).json({
        error: 'Only project members can send messages'
      });
    }

    const message = await prisma.message.create({
      data: {
        content: data.content,
        projectId: req.params.id,
        userId: req.user.id
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            college: true
          }
        }
      }
    });

    res.status(201).json(message);
  } catch (error) {
    next(error);
  }
});

/* =========================================================
   PROJECT AI
========================================================= */

router.post('/:id/ai', auth, async (req, res, next) => {
  try {
    const { question } = aiSchema.parse(req.body);

    const project = await prisma.project.findUnique({
      where: {
        id: req.params.id
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            college: true,
            skills: true,
            bio: true
          }
        },
        applications: {
          where: {
            status: 'ACCEPTED'
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                college: true,
                skills: true,
                bio: true
              }
            }
          }
        }
      }
    });

    if (!project) {
      return res.status(404).json({
        error: 'Project not found'
      });
    }

    const allowed = await isProjectMember(
      req.params.id,
      req.user.id
    );

    if (!allowed) {
      return res.status(403).json({
        error: 'Only project members can use Project AI'
      });
    }

    const gemini = getGeminiClient();

if (!gemini) {
  return res.status(503).json({
    error:
      'Project AI is not configured. Please add GEMINI_API_KEY to the server .env file.'
  });
}

    const members = [
      {
        name: project.owner.name,
        college: project.owner.college,
        skills: project.owner.skills,
        bio: project.owner.bio,
        role: 'Project Owner'
      },
      ...project.applications.map((application) => ({
        name: application.user.name,
        college: application.user.college,
        skills: application.user.skills,
        bio: application.user.bio,
        role: 'Team Member'
      }))
    ];

    const projectContext = `
PROJECT
Title: ${project.title}
Description: ${project.description}
Category: ${project.category}
Required Skills: ${project.skills.join(', ')}
Maximum Members: ${project.maxMembers}
Current Members: ${members.length}

TEAM
${members
  .map(
    (member, index) => `
${index + 1}. ${member.name}
Role: ${member.role}
College: ${member.college || 'Not provided'}
Skills: ${
      member.skills?.length
        ? member.skills.join(', ')
        : 'Not provided'
    }
Bio: ${member.bio || 'Not provided'}
`
  )
  .join('\n')}
`;

   const response = await gemini.models.generateContent({
  model: process.env.GEMINI_MODEL || 'gemini-3.8-flash',

  contents: `
You are ProjectHub AI, an AI assistant inside a student project collaboration platform.

Your job is to help student teams build their project.

You have access to the current project and team information.

Give practical, concise and useful answers.

You can help with:
- project ideas
- feature planning
- task division
- technology choices
- coding guidance
- debugging approaches
- database design
- UI/UX suggestions
- learning resources
- project roadmaps
- presentation ideas
- hackathon preparation
- team collaboration

Important rules:
- Stay focused on the current project.
- Use the team's actual skills when suggesting task assignments.
- Do not invent information about team members.
- If information is missing, clearly say that it is not provided.
- Prefer actionable steps.
- Keep answers understandable for college students.

CURRENT PROJECT:

${projectContext}

TEAM MEMBER QUESTION:

${question}
  `
});

const answer = response.text?.trim();
if (!answer) {
  return res.status(502).json({
    error: 'Project AI returned an empty response'
  });
}

res.json({
  answer
});

} catch (error) {
  console.error('Project AI error:', error);
  next(error);
  }
});

export default router;