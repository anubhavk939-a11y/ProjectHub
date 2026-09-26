import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import auth from './routes/auth.js';
import users from './routes/users.js';
import projects from './routes/projects.js';
import { prisma } from './utils/prisma.js';

if(!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required');
const app=express();
app.use(cors({origin:process.env.CLIENT_URL?.split(',')||true}));
app.use(express.json({limit:'1mb'}));
app.get('/api/health',async(_req,res)=>{await prisma.$queryRaw`SELECT 1`;res.json({ok:true,service:'projecthub-api'});});
app.use('/api/auth',auth); app.use('/api/users',users); app.use('/api/projects',projects);
app.use((err,_req,res,_next)=>{console.error(err);if(err.name==='ZodError')return res.status(400).json({error:'Invalid input',details:err.issues});if(err.code==='P2002')return res.status(409).json({error:'A record with that value already exists'});res.status(500).json({error:'Internal server error'});});
const port=Number(process.env.PORT||5000);app.listen(port,()=>console.log(`ProjectHub API running on http://localhost:${port}`));
process.on('SIGINT',async()=>{await prisma.$disconnect();process.exit(0)});
