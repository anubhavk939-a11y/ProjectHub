import React,{createContext,useContext,useEffect,useState} from 'react';
import {api} from './api';
const C=createContext(null);
export function AuthProvider({children}){const [user,setUser]=useState(null);const [loading,setLoading]=useState(true);useEffect(()=>{if(localStorage.getItem('projecthub_token'))api.me().then(setUser).catch(()=>localStorage.removeItem('projecthub_token')).finally(()=>setLoading(false));else setLoading(false)},[]);const login=async(d)=>{const r=await api.login(d);localStorage.setItem('projecthub_token',r.token);setUser(r.user);return r};const register=async(d)=>{const r=await api.register(d);localStorage.setItem('projecthub_token',r.token);setUser(r.user);return r};const logout=()=>{localStorage.removeItem('projecthub_token');setUser(null)};return <C.Provider value={{user,loading,login,register,logout,setUser}}>{children}</C.Provider>}
export const useAuth=()=>useContext(C);
