import * as real from '../controllers/supabase.controller.js'
import { Router } from 'express'
import { query,transaction } from '../config/db.js'
import { workflowHandler,sow,finish } from '../data/checklistWorkflow.js'

const router = Router()

router.get('/:id', real.getHuerto)
const checklistRoute=operation=>(req,res)=>{
  req.params.huertoId=req.params.id
  return workflowHandler({query},transaction,operation)(req,res)
}
router.post('/:id/sembrar', checklistRoute((db,user,garden,req,env)=>sow(db,user,garden,req.body,env)))
router.post('/:id/cosechar', checklistRoute((db,user,garden,req,env)=>finish(db,user,garden,req.body.tareaId,req.body,env)))

export default router
