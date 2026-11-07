import * as real from '../controllers/supabase.controller.js'
import { Router } from 'express'
import { login, registro, logout, presence } from '../controllers/auth.controller.js'

const router = Router()

router.post('/login', login)
router.post('/registro', real.realOrDemo(real.registro, registro))
router.post('/logout', logout)
router.post('/presence', presence)

export default router
