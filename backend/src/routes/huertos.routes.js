import { Router } from 'express'
import {
  getHuerto,
  sembrarCultivo,
  cosecharCultivo,
} from '../controllers/huertos.controller.js'

const router = Router()

router.get('/:id', getHuerto)
router.post('/:id/sembrar', sembrarCultivo)
router.post('/:id/cosechar', cosecharCultivo)

export default router
