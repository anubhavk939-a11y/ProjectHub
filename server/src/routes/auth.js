import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';

const router=Router();
const signupSchema=z.object({name:z.string().min(2),email:z.string().email(),password:z.string().min(8),college:z.string().optional()});
const loginSchema=z.object({email:z.string().email(),password:z.string().min(1)});
const tokenFor=(u)=>jwt.sign({id:u.id,email:u.email,role:u.role},process.env.JWT_SECRET,{expiresIn:'7d'});
const safe=(u)=>({id:u.id,name:u.name,email:u.email,college:u.college,bio:u.bio,avatarUrl:u.avatarUrl,githubUrl:u.githubUrl,linkedinUrl:u.linkedinUrl,skills:u.skills,role:u.role});
router.post('/register', async (req, res, next) => {
  try {
    console.log('REGISTER: request received');

    const d = signupSchema.parse(req.body);
    console.log('REGISTER: validation passed');

    const email = d.email.toLowerCase();

    const exists = await prisma.user.findUnique({
      where: { email }
    });
    console.log('REGISTER: database lookup completed');

    if (exists) {
      return res.status(409).json({
        error: 'Email already registered'
      });
    }

    console.log('REGISTER: starting password hash');

const passwordHash = await bcrypt.hash(d.password, 12);

console.log('REGISTER: password hash completed');

    const user = await prisma.user.create({
      data: {
        name: d.name,
        email,
        college: d.college,
        passwordHash,
        skills: []
      }
    });
    console.log('REGISTER: user created');

    const token = tokenFor(user);
    console.log('REGISTER: token created');

    res.status(201).json({
      token,
      user: safe(user)
    });
  } catch (e) {
    console.error('REGISTER ERROR:', e);
    next(e);
  }
});
router.post('/login',async(req,res,next)=>{try{const d=loginSchema.parse(req.body);const u=await prisma.user.findUnique({where:{email:d.email.toLowerCase()}});if(!u||!(await bcrypt.compare(d.password,u.passwordHash)))return res.status(401).json({error:'Invalid email or password'});res.json({token:tokenFor(u),user:safe(u)});}catch(e){next(e)}});
export default router;
