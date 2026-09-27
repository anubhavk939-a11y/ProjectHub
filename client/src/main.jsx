import React, {
  useEffect,
  useMemo,
  useState
} from 'react';

import { createRoot } from 'react-dom/client';

import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  ChevronRight,
  Code2,
  GraduationCap,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  MessageCircle,
  Plus,
  Search,
  Send,
  Sparkles,
  User,
  Users,
  X
} from 'lucide-react';

import './styles.css';

import { api } from './api';

import {
  AuthProvider,
  useAuth
} from './auth';


/* =========================================================
   APP
========================================================= */

function App() {
  const {
    user,
    loading,
    logout
  } = useAuth();

  const [page, setPage] = useState('home');

  const [projects, setProjects] = useState([]);

  const [query, setQuery] = useState('');

  const [showCreate, setShowCreate] = useState(false);

  const [showAuth, setShowAuth] = useState(false);

  const [toast, setToast] = useState('');

  const [menu, setMenu] = useState(false);

  const [workspaceProject, setWorkspaceProject] =
    useState(null);

  const notify = (message) => {
    setToast(message);

    setTimeout(() => {
      setToast('');
    }, 2200);
  };


  /* Load projects */

  useEffect(() => {
    api.projects()
      .then(setProjects)
      .catch(() => {});
  }, []);


  /* Search */

  const filtered = useMemo(() => {
    return projects.filter((project) => {
      const text = [
        project.title,
        project.description,
        ...(project.skills || []),
        project.category
      ]
        .join(' ')
        .toLowerCase();

      return text.includes(query.toLowerCase());
    });
  }, [projects, query]);


  if (loading) {
    return (
      <div className="loading">
        Loading ProjectHub…
      </div>
    );
  }


  /* Open workspace */

  const openWorkspace = async (projectId) => {
    try {
      const project = await api.project(projectId);

      const isOwner =
        project.owner?.id === user?.id;

      const accepted =
        project.applications?.some(
          (application) =>
            application.user?.id === user?.id &&
            application.status === 'ACCEPTED'
        );

      if (!isOwner && !accepted) {
        notify(
          'You need to be an accepted team member to enter the workspace.'
        );
        return;
      }

      setWorkspaceProject(project);

      setPage('workspace');

    } catch (error) {
      notify(error.message);
    }
  };


  return (
    <div className="app">

      {/* =====================================================
          NAVBAR
      ===================================================== */}

      <header className="nav">

        <div
          className="brand"
          onClick={() => {
            setPage('home');
            setWorkspaceProject(null);
          }}
        >
          <span className="brandMark">
            P
          </span>

          <span>
            Project
            <span>Hub</span>
          </span>
        </div>


        <nav className={menu ? 'open' : ''}>

          <button
            className={
              page === 'home'
                ? 'active'
                : ''
            }
            onClick={() => {
              setPage('home');
              setMenu(false);
            }}
          >
            Home
          </button>


          <button
            className={
              page === 'projects'
                ? 'active'
                : ''
            }
            onClick={() => {
              setPage('projects');
              setMenu(false);
            }}
          >
            Explore
          </button>


          {user && (
            <button
              className={
                page === 'profile'
                  ? 'active'
                  : ''
              }
              onClick={() => {
                setPage('profile');
                setMenu(false);
              }}
            >
              My Profile
            </button>
          )}

        </nav>


        <div className="navActions">

          {user ? (
            <>
              <button
                className="outline hideMobile"
                onClick={() =>
                  setShowCreate(true)
                }
              >
                <Plus size={17} />
                Create Project
              </button>


              <button
                className="avatar"
                onClick={() =>
                  setPage('profile')
                }
              >
                {user.name
                  .split(' ')
                  .map((x) => x[0])
                  .slice(0, 2)
                  .join('')}
              </button>


              <button
                className="mobileMenu"
                onClick={() =>
                  setMenu(!menu)
                }
              >
                <Menu />
              </button>
            </>
          ) : (
            <>
              <button
                className="outline hideMobile"
                onClick={() =>
                  setShowAuth(true)
                }
              >
                Sign in
              </button>


              <button
                className="primary"
                onClick={() =>
                  setShowAuth(true)
                }
              >
                Get started
              </button>


              <button
                className="mobileMenu"
                onClick={() =>
                  setMenu(!menu)
                }
              >
                <Menu />
              </button>
            </>
          )}

        </div>

      </header>


      {/* =====================================================
          PAGES
      ===================================================== */}

      {page === 'home' && (
        <Home
          setPage={setPage}
          setShowCreate={setShowCreate}
          user={user}
        />
      )}


      {page === 'projects' && (
        <Explore
          projects={filtered}
          query={query}
          setQuery={setQuery}
          user={user}
          notify={notify}
          openWorkspace={openWorkspace}
          onApply={async (id) => {

            if (!user) {
              setShowAuth(true);
              return;
            }

            try {
              await api.apply(id);

              notify(
                'Application sent!'
              );

            } catch (error) {
              notify(error.message);
            }

          }}
        />
      )}


      {page === 'profile' && user && (
        <Profile
          user={user}
          notify={notify}
          openWorkspace={openWorkspace}
        />
      )}


      {page === 'workspace' &&
        workspaceProject &&
        user && (
          <ProjectWorkspace
            project={workspaceProject}
            user={user}
            onBack={() => {
              setPage('profile');
              setWorkspaceProject(null);
            }}
            notify={notify}
          />
        )}


      {/* =====================================================
          MODALS
      ===================================================== */}

      {showCreate && (
        <CreateModal
          onClose={() =>
            setShowCreate(false)
          }
          onCreate={async (data) => {

            try {

              const project =
                await api.createProject(data);

              setProjects([
                project,
                ...projects
              ]);

              setShowCreate(false);

              setPage('projects');

              notify(
                'Project published successfully!'
              );

            } catch (error) {
              notify(error.message);
            }

          }}
        />
      )}


      {showAuth && (
        <AuthModal
          onClose={() =>
            setShowAuth(false)
          }
          notify={notify}
        />
      )}


      {toast && (
        <div className="toast">
          <Check size={17} />
          {toast}
        </div>
      )}


      {/* =====================================================
          FOOTER
      ===================================================== */}

      {page !== 'workspace' && (
        <footer>
          <div>
            <b>ProjectHub</b>
            <span>
              {' '}
              Build together. Grow together.
            </span>
          </div>

          <span>
            © 2026 ProjectHub
          </span>
        </footer>
      )}

    </div>
  );
}


/* =========================================================
   HOME
========================================================= */

function Home({
  setPage,
  setShowCreate,
  user
}) {

  return (
    <main>

      <section className="hero">

        <div className="heroGlow" />

        <div className="eyebrow">
          <Sparkles size={15} />
          The collaboration platform for builders
        </div>


        <h1>
          Find your team.
          <br />
          <span>
            Build something real.
          </span>
        </h1>


        <p>
          ProjectHub connects students with
          the skills, ideas and ambition to
          build meaningful projects together.
        </p>


        <div className="heroBtns">

          <button
            className="primary large"
            onClick={() =>
              setPage('projects')
            }
          >
            Explore projects
            <ArrowRight size={18} />
          </button>


          <button
            className="ghost large"
            onClick={() =>
              user
                ? setShowCreate(true)
                : setPage('projects')
            }
          >
            Start a project
            <Plus size={18} />
          </button>

        </div>


        <div className="stats">

          <div>
            <strong>Project</strong>
            <span>discovery</span>
          </div>

          <div>
            <strong>Team</strong>
            <span>matching</span>
          </div>

          <div>
            <strong>Skills</strong>
            <span>showcase</span>
          </div>

        </div>

      </section>


      <section className="featureGrid">

        <Feature
          icon={<Users />}
          title="Find teammates"
          text="Discover students by skills, interests and project goals."
        />

        <Feature
          icon={<LayoutDashboard />}
          title="Build together"
          text="Create a project, recruit teammates and grow your portfolio."
        />

        <Feature
          icon={<Sparkles />}
          title="AI assistance"
          text="Get project-specific help from an AI assistant while you build."
        />

      </section>

    </main>
  );
}


/* =========================================================
   FEATURE
========================================================= */

function Feature({
  icon,
  title,
  text
}) {

  return (
    <div className="feature">

      <div className="iconBox">
        {icon}
      </div>

      <h3>
        {title}
      </h3>

      <p>
        {text}
      </p>

    </div>
  );
}


/* =========================================================
   EXPLORE
========================================================= */

function Explore({
  projects,
  query,
  setQuery,
  user,
  notify,
  openWorkspace,
  onApply
}) {

  return (
    <main className="content">

      <div className="sectionHead">

        <div>

          <div className="eyebrow">
            DISCOVER
          </div>

          <h2>
            Projects looking for people
          </h2>

          <p>
            Find something worth building
            and bring your skills to the team.
          </p>

        </div>


        <div className="search">

          <Search size={18} />

          <input
            value={query}
            onChange={(e) =>
              setQuery(e.target.value)
            }
            placeholder="Search projects, skills…"
          />

        </div>

      </div>


      <div className="projectGrid">

        {projects.map((project) => (

          <ProjectCard
            key={project.id}
            project={project}
            user={user}
            notify={notify}
            openWorkspace={openWorkspace}
            onApply={onApply}
          />

        ))}

      </div>


      {!projects.length && (
        <div className="empty">
          No projects found yet.
          Try another search.
        </div>
      )}

    </main>
  );
}


/* =========================================================
   PROJECT CARD
========================================================= */

function ProjectCard({
  project,
  user,
  notify,
  openWorkspace,
  onApply
}) {

  const [checking, setChecking] =
    useState(false);


  const handleAction = async () => {

    if (!user) {
      onApply(project.id);
      return;
    }


    setChecking(true);

    try {

      const details =
        await api.project(project.id);

      const isOwner =
        details.owner?.id === user.id;


      const isAccepted =
        details.applications?.some(
          (application) =>
            application.user?.id === user.id &&
            application.status === 'ACCEPTED'
        );


      if (isOwner || isAccepted) {

        openWorkspace(project.id);

      } else {

        onApply(project.id);

      }

    } catch (error) {

      notify(error.message);

    } finally {

      setChecking(false);

    }

  };


  return (
    <article className="projectCard">

      <div className="cardTop">

        <span className="pill">
          {project.category}
        </span>

        <span className="status">
          {project.status ||
            'RECRUITING'}
        </span>

      </div>


      <h3>
        {project.title}
      </h3>


      <p>
        {project.description}
      </p>


      <div className="skills">

        {(project.skills || []).map(
          (skill) => (
            <span key={skill}>
              {skill}
            </span>
          )
        )}

      </div>


      <div className="cardBottom">

        <span>
          <Users size={16} />
          {project.members || 1}/
          {project.maxMembers}
          {' '}
          members
        </span>


        <button
          className="apply"
          onClick={handleAction}
          disabled={checking}
        >

          {checking
            ? 'Opening…'
            : 'View / Apply'}

          <ArrowRight size={15} />

        </button>

      </div>

    </article>
  );
}


/* =========================================================
   PROJECT WORKSPACE
========================================================= */

function ProjectWorkspace({
  project,
  user,
  onBack,
  notify
}) {

  const [messages, setMessages] =
    useState([]);

  const [message, setMessage] =
    useState('');

  const [sending, setSending] =
    useState(false);

  const [loadingMessages, setLoadingMessages] =
    useState(true);
    const [aiQuestion, setAiQuestion] = useState('');
const [aiAnswer, setAiAnswer] = useState('');
const [aiLoading, setAiLoading] = useState(false);


  /* Load messages */

  const loadMessages = async (
    showLoader = false
  ) => {

    try {

      if (showLoader) {
        setLoadingMessages(true);
      }

      const data =
        await api.messages(project.id);

      setMessages(data);

    } catch (error) {

      notify(error.message);

    } finally {

      setLoadingMessages(false);

    }

  };
  const askProjectAI = async () => {
  const question = aiQuestion.trim();

  if (!question || aiLoading) {
    return;
  }

  try {
    setAiLoading(true);
    setAiAnswer('');

    const data = await api.projectAI(
      project.id,
      question
    );

    setAiAnswer(data.answer);
  } catch (error) {
    setAiAnswer(
      error.message ||
        'Something went wrong while contacting Project AI.'
    );
  } finally {
    setAiLoading(false);
  }
};


  /* Initial load */

  useEffect(() => {

    loadMessages(true);

  }, [project.id]);


  /* Simple realtime polling */

  useEffect(() => {

    const interval =
      setInterval(() => {
        loadMessages(false);
      }, 3000);

    return () =>
      clearInterval(interval);

  }, [project.id]);


  /* Send message */

  const sendMessage = async (event) => {

    event.preventDefault();

    const text =
      message.trim();

    if (!text || sending) {
      return;
    }


    try {

      setSending(true);

      const newMessage =
        await api.sendMessage(
          project.id,
          text
        );

      setMessages((current) => [
        ...current,
        newMessage
      ]);

      setMessage('');

    } catch (error) {

      notify(error.message);

    } finally {

      setSending(false);

    }

  };


  const members = [
    {
      id: project.owner.id,
      name: project.owner.name,
      college: project.owner.college,
      skills: project.owner.skills || [],
      owner: true
    },

    ...(project.applications || [])
      .filter(
        (application) =>
          application.status ===
          'ACCEPTED'
      )
      .map(
        (application) => ({
          id: application.user.id,
          name: application.user.name,
          college:
            application.user.college,
          skills:
            application.user.skills || [],
          owner: false
        })
      )
  ];


  return (
    <main className="workspacePage">

      {/* =================================================
          WORKSPACE HEADER
      ================================================= */}

      <div className="workspaceHeader">

        <button
          className="outline"
          onClick={onBack}
        >
          <ArrowLeft size={17} />
          Back
        </button>


        <div className="workspaceTitle">

          <div className="eyebrow">
            PROJECT WORKSPACE
          </div>

          <h2>
            {project.title}
          </h2>

          <p>
            {project.description}
          </p>

        </div>


        <div className="workspaceBadge">
          <Users size={16} />
          {members.length}/
          {project.maxMembers}
        </div>

      </div>


      {/* =================================================
          WORKSPACE GRID
      ================================================= */}

      <div className="workspaceGrid">


        {/* ===============================================
            TEAM
        =============================================== */}

        <aside className="teamPanel">

          <div className="workspacePanelTitle">

            <div>
              <span className="eyebrow">
                TEAM
              </span>

              <h3>
                Members
              </h3>
            </div>

            <Users size={20} />

          </div>


          <div className="teamList">

            {members.map((member) => (

              <div
                className="teamMember"
                key={member.id}
              >

                <div className="memberAvatar">
                  {member.name
                    .split(' ')
                    .map(
                      (part) =>
                        part[0]
                    )
                    .slice(0, 2)
                    .join('')}
                </div>


                <div className="memberInfo">

                  <strong>
                    {member.name}
                  </strong>

                  <span>
                    {member.owner
                      ? 'Project Owner'
                      : member.college ||
                        'Student'}
                  </span>

                </div>

              </div>

            ))}

          </div>


          {/* Project AI */}

<div className="aiPanel">
  <div className="aiPanelHeader">
    <div className="aiPanelIcon">
      <Sparkles size={20} />
    </div>

    <div>
      <strong>Project AI</strong>
      <p>Your AI assistant for this project</p>
    </div>
  </div>

  <div className="aiAnswer">
    {!aiAnswer && !aiLoading && (
      <div className="aiWelcome">
        <Bot size={24} />

        <div>
          <strong>Need help with your project?</strong>

          <p>
            Ask me about your roadmap, features,
            technology, task division or presentation.
          </p>
        </div>
      </div>
    )}

    {aiLoading && (
      <div className="aiLoading">
        <Loader2 className="spin" size={18} />
        <span>Project AI is thinking...</span>
      </div>
    )}

    {aiAnswer && !aiLoading && (
      <div className="aiResponse">
        <div className="aiResponseIcon">
          <Sparkles size={16} />
        </div>

        <div>
          <strong>Project AI</strong>

          <p>{aiAnswer}</p>
        </div>
      </div>
    )}
  </div>

  <div className="aiInputRow">
    <input
      value={aiQuestion}
      onChange={(event) =>
        setAiQuestion(event.target.value)
      }
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          askProjectAI();
        }
      }}
      placeholder="Ask Project AI..."
      disabled={aiLoading}
    />

    <button
      onClick={askProjectAI}
      disabled={!aiQuestion.trim() || aiLoading}
      title="Ask Project AI"
    >
      {aiLoading ? (
        <Loader2 className="spin" size={17} />
      ) : (
        <Send size={17} />
      )}
    </button>
  </div>
</div>
        </aside>


        {/* ===============================================
            CHAT
        =============================================== */}

        <section className="chatPanel">

          <div className="chatHeader">

            <div>

              <div className="chatTitle">

                <MessageCircle size={20} />

                <strong>
                  Team Chat
                </strong>

              </div>

              <span>
                Private conversation
                for this project
              </span>

            </div>


            <span className="onlineDot">
              Team
            </span>

          </div>


          <div className="messagesArea">

            {loadingMessages ? (

              <div className="chatEmpty">
                Loading chat…
              </div>

            ) : messages.length === 0 ? (

              <div className="chatEmpty">

                <MessageCircle
                  size={42}
                />

                <h3>
                  Start the conversation
                </h3>

                <p>
                  Talk with your team
                  about the project.
                </p>

              </div>

            ) : (

              messages.map((item) => {

                const mine =
                  item.userId === user.id;

                return (
                  <div
                    className={
                      mine
                        ? 'messageRow mine'
                        : 'messageRow'
                    }
                    key={item.id}
                  >

                    {!mine && (
                      <div className="messageAvatar">
                        {item.user?.name
                          ?.split(' ')
                          .map(
                            (part) =>
                              part[0]
                          )
                          .slice(0, 2)
                          .join('')}
                      </div>
                    )}


                    <div className="messageBubble">

                      {!mine && (
                        <strong>
                          {item.user?.name}
                        </strong>
                      )}

                      <p>
                        {item.content}
                      </p>

                      <small>
                        {new Date(
                          item.createdAt
                        ).toLocaleTimeString(
                          [],
                          {
                            hour: '2-digit',
                            minute: '2-digit'
                          }
                        )}
                      </small>

                    </div>

                  </div>
                );

              })

            )}

          </div>


          <form
            className="chatComposer"
            onSubmit={sendMessage}
          >

            <input
              value={message}
              onChange={(event) =>
                setMessage(
                  event.target.value
                )
              }
              placeholder="Message your team…"
              maxLength={2000}
            />


            <button
              className="primary"
              type="submit"
              disabled={
                sending ||
                !message.trim()
              }
            >

              <Send size={17} />

              {sending
                ? 'Sending…'
                : 'Send'}

            </button>

          </form>

        </section>

      </div>

    </main>
  );
}


/* =========================================================
   CREATE PROJECT MODAL
========================================================= */

function CreateModal({
  onClose,
  onCreate
}) {

  const [data, setData] =
    useState({
      title: '',
      description: '',
      category:
        'Web Development',
      skills: ['React'],
      maxMembers: 4
    });


  const [skills, setSkills] =
    useState('React');


  const submit = (event) => {

    event.preventDefault();

    onCreate({
      ...data,
      skills: skills
        .split(',')
        .map(
          (skill) =>
            skill.trim()
        )
        .filter(Boolean),

      maxMembers:
        Number(data.maxMembers)
    });

  };


  return (
    <div className="overlay">

      <div className="modal">

        <button
          className="close"
          onClick={onClose}
        >
          <X />
        </button>


        <div className="eyebrow">
          NEW PROJECT
        </div>


        <h2>
          Create your project
        </h2>


        <form onSubmit={submit}>

          <label>
            Project name

            <input
              required
              value={data.title}
              onChange={(event) =>
                setData({
                  ...data,
                  title:
                    event.target.value
                })
              }
              placeholder="e.g. AI Study Assistant"
            />
          </label>


          <label>
            Description

            <textarea
              required
              value={data.description}
              onChange={(event) =>
                setData({
                  ...data,
                  description:
                    event.target.value
                })
              }
              placeholder="What are you building? What problem does it solve?"
            />
          </label>


          <div className="two">

            <label>
              Category

              <select
                value={data.category}
                onChange={(event) =>
                  setData({
                    ...data,
                    category:
                      event.target.value
                  })
                }
              >
                <option>
                  AI & ML
                </option>

                <option>
                  Web Development
                </option>

                <option>
                  Mobile
                </option>

                <option>
                  Data Science
                </option>

                <option>
                  EdTech
                </option>

                <option>
                  Other
                </option>

              </select>
            </label>


            <label>
              Team size

              <input
                type="number"
                min="2"
                max="20"
                value={data.maxMembers}
                onChange={(event) =>
                  setData({
                    ...data,
                    maxMembers:
                      event.target.value
                  })
                }
              />
            </label>

          </div>


          <label>
            Skills
            <small>
              comma separated
            </small>

            <input
              value={skills}
              onChange={(event) =>
                setSkills(
                  event.target.value
                )
              }
              placeholder="Python, React, Figma"
            />
          </label>


          <button
            className="primary full"
            type="submit"
          >
            Publish project
            <ArrowRight size={17} />
          </button>

        </form>

      </div>

    </div>
  );
}


/* =========================================================
   AUTH MODAL
========================================================= */

function AuthModal({
  onClose,
  notify
}) {

  const {
    login,
    register
  } = useAuth();


  const [mode, setMode] =
    useState('login');


  const [data, setData] =
    useState({
      name: '',
      email: '',
      password: '',
      college: ''
    });


  const [busy, setBusy] =
    useState(false);


  const submit = async (event) => {

    event.preventDefault();

    setBusy(true);

    try {

      if (mode === 'login') {

        await login({
          email: data.email,
          password: data.password
        });

      } else {

        await register(data);

      }

      onClose();

      notify(
        mode === 'login'
          ? 'Welcome back!'
          : 'Account created!'
      );

    } catch (error) {

      notify(error.message);

    } finally {

      setBusy(false);

    }

  };


  return (
    <div className="overlay">

      <div className="modal auth">

        <button
          className="close"
          onClick={onClose}
        >
          <X />
        </button>


        <div className="eyebrow">
          PROJECTHUB ACCOUNT
        </div>


        <h2>
          {mode === 'login'
            ? 'Welcome back'
            : 'Create your account'}
        </h2>


        <form onSubmit={submit}>

          {mode === 'register' && (
            <label>
              Name

              <input
                required
                value={data.name}
                onChange={(event) =>
                  setData({
                    ...data,
                    name:
                      event.target.value
                  })
                }
              />
            </label>
          )}


          <label>
            Email

            <input
              required
              type="email"
              value={data.email}
              onChange={(event) =>
                setData({
                  ...data,
                  email:
                    event.target.value
                })
              }
            />
          </label>


          {mode === 'register' && (
            <label>
              College

              <input
                value={data.college}
                onChange={(event) =>
                  setData({
                    ...data,
                    college:
                      event.target.value
                  })
                }
              />
            </label>
          )}


          <label>
            Password

            <input
              required
              minLength="8"
              type="password"
              value={data.password}
              onChange={(event) =>
                setData({
                  ...data,
                  password:
                    event.target.value
                })
              }
            />
          </label>


          <button
            disabled={busy}
            className="primary full"
            type="submit"
          >
            {busy
              ? 'Please wait…'
              : mode === 'login'
                ? 'Sign in'
                : 'Create account'}
          </button>

        </form>


        <button
          className="switch"
          onClick={() =>
            setMode(
              mode === 'login'
                ? 'register'
                : 'login'
            )
          }
        >
          {mode === 'login'
            ? "Don't have an account? Create one"
            : 'Already have an account? Sign in'}
        </button>

      </div>

    </div>
  );
}


/* =========================================================
   PROFILE
========================================================= */

function Profile({
  user,
  notify,
  openWorkspace
}) {

  const {
    setUser,
    logout
  } = useAuth();


  const [data, setData] =
    useState({
      ...user,
      skills: user.skills || []
    });


  const [skills, setSkills] =
    useState(
      (user.skills || []).join(', ')
    );


  const [myProjects, setMyProjects] =
    useState([]);


  const [loadingProjects, setLoadingProjects] =
    useState(true);


  /* Save profile */

  const save = async () => {

    try {

      const updated =
        await api.updateMe({
          ...data,
          skills: skills
            .split(',')
            .map(
              (skill) =>
                skill.trim()
            )
            .filter(Boolean)
        });

      setUser(updated);

      notify(
        'Profile saved!'
      );

    } catch (error) {

      notify(error.message);

    }

  };


  /* Load projects */

  useEffect(() => {

    const load = async () => {

      try {

        const all =
          await api.projects();


        const accessible = [];

        for (const project of all) {

          try {

            const details =
              await api.project(
                project.id
              );


            const owner =
              details.owner?.id === user.id;


            const accepted =
              details.applications?.some(
                (application) =>
                  application.user?.id ===
                    user.id &&
                  application.status ===
                    'ACCEPTED'
              );


            if (owner || accepted) {

              accessible.push({
                ...project,
                details
              });

            }

          } catch {
            // Ignore individual project errors
          }

        }

        setMyProjects(accessible);

      } catch (error) {

        notify(error.message);

      } finally {

        setLoadingProjects(false);

      }

    };


    load();

  }, [user.id]);


  return (
    <main className="content">

      {/* Profile header */}

      <div className="profileHead">

        <div className="bigAvatar">

          {user.name
            .split(' ')
            .map((x) => x[0])
            .slice(0, 2)
            .join('')}

        </div>


        <div>

          <div className="eyebrow">
            MY PROFILE
          </div>

          <h2>
            {user.name}
          </h2>

          <p>
            {user.college ||
              'Add your college'}
            {' · '}
            {user.email}
          </p>

        </div>


        <button
          className="outline danger"
          onClick={logout}
        >
          <LogOut size={16} />
          Sign out
        </button>

      </div>


      {/* Profile form */}

      <div className="profileForm">

        <label>
          Name

          <input
            value={data.name}
            onChange={(event) =>
              setData({
                ...data,
                name:
                  event.target.value
              })
            }
          />
        </label>


        <label>
          College

          <input
            value={data.college || ''}
            onChange={(event) =>
              setData({
                ...data,
                college:
                  event.target.value
              })
            }
          />
        </label>


        <label>
          Bio

          <textarea
            value={data.bio || ''}
            onChange={(event) =>
              setData({
                ...data,
                bio:
                  event.target.value
              })
            }
          />
        </label>


        <label>
          Skills
          <small>
            comma separated
          </small>

          <input
            value={skills}
            onChange={(event) =>
              setSkills(
                event.target.value
              )
            }
          />
        </label>


        <div className="two">

          <label>
            GitHub

            <input
              value={data.githubUrl || ''}
              onChange={(event) =>
                setData({
                  ...data,
                  githubUrl:
                    event.target.value
                })
              }
            />
          </label>


          <label>
            LinkedIn

            <input
              value={
                data.linkedinUrl || ''
              }
              onChange={(event) =>
                setData({
                  ...data,
                  linkedinUrl:
                    event.target.value
                })
              }
            />
          </label>

        </div>


        <button
          className="primary"
          onClick={save}
        >
          Save profile
          <Check size={17} />
        </button>

      </div>


      {/* =================================================
          MY PROJECT WORKSPACES
      ================================================= */}

      <div
        style={{
          marginTop: '40px'
        }}
      >

        <div className="eyebrow">
          MY WORKSPACES
        </div>

        <h2
          style={{
            marginTop: '8px'
          }}
        >
          Your project teams
        </h2>

        <p>
          Open a workspace to chat
          with your team.
        </p>


        {loadingProjects ? (

          <div className="empty">
            Loading your projects…
          </div>

        ) : myProjects.length === 0 ? (

          <div className="empty">
            You don't have an active
            project team yet.
          </div>

        ) : (

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '18px',
              marginTop: '22px'
            }}
          >

            {myProjects.map(
              (project) => (

                <div
                  key={project.id}
                  className="projectCard"
                >

                  <div className="cardTop">

                    <span className="pill">
                      {project.category}
                    </span>

                    <span className="status">
                      TEAM
                    </span>

                  </div>


                  <h3>
                    {project.title}
                  </h3>


                  <p>
                    {project.description}
                  </p>


                  <div
                    className="cardBottom"
                    style={{
                      marginTop: '20px'
                    }}
                  >

                    <span>
                      <Users size={16} />
                      {project.members || 1}/
                      {project.maxMembers}
                    </span>


                    <button
                      className="apply"
                      onClick={() =>
                        openWorkspace(
                          project.id
                        )
                      }
                    >
                      Open Workspace
                      <ArrowRight
                        size={15}
                      />
                    </button>

                  </div>

                </div>

              )
            )}

          </div>

        )}

      </div>

    </main>
  );
}


/* =========================================================
   START APP
========================================================= */

createRoot(
  document.getElementById('root')
).render(
  <AuthProvider>
    <App />
  </AuthProvider>
);