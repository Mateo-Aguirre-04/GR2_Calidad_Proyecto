import { Router } from 'express'
import { getPlantas, getPlantaById } from '../controllers/plantas.controller.js'

const router = Router()

router.get('/', getPlantas)
router.get('/:id', getPlantaById)

export default router
