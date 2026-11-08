import * as real from '../controllers/supabase.controller.js'
import { Router } from 'express'
import { query,transaction } from '../config/db.js'
import { workflowHandler,sow,finish } from '../data/checklistWorkflow.js'
import {
  getHuerto,
  sembrarCultivo,
  cosecharCultivo,
} from '../controllers/huertos.controller.js'

const router = Router()

router.get('/:id', real.realOrDemo(real.getHuerto, getHuerto))
const checklistRoute=operation=>(req,res)=>{
  req.params.huertoId=req.params.id
  return workflowHandler({query},transaction,operation)(req,res)
}
router.post('/:id/sembrar', real.realOrDemo(checklistRoute((db,user,garden,req,env)=>sow(db,user,garden,req.body,env)), sembrarCultivo))
router.post('/:id/cosechar', real.realOrDemo(checklistRoute((db,user,garden,req,env)=>finish(db,user,garden,req.body.tareaId,req.body,env)), cosecharCultivo))
router.post('/:id/eventos', real.registrarEventoHuerto)

export default router
