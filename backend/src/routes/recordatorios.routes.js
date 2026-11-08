import * as real from '../controllers/supabase.controller.js'
import { Router } from 'express'
import { query, transaction } from '../config/db.js'
import { enrollTask, taskMutationHandler } from '../data/taskParticipation.js'
import { recordWatering } from '../data/watering.js'
import { workflowHandler, panel, synchronize, createZone, startCycle, configureCrop, finalizeCrop, schedule, sow, finish, startDrying } from '../data/checklistWorkflow.js'
import {
  getRecordatorios,
  completarRecordatorio,
} from '../controllers/recordatorios.controller.js'

export function createRecordatoriosRouter(db = { query }, runTransaction = transaction, environment) {
  const router = Router()
  const workflow=(operation,read=false)=>workflowHandler(db,runTransaction,operation,{read,environment})

  router.get('/huerto/:huertoId', workflow(async(client,user,garden,req,env)=>(await panel(client,user,garden,env)).tareas,true))
  router.get('/huerto/:huertoId/panel', workflow((client,user,garden,req,env)=>panel(client,user,garden,env),true))
  router.post('/huerto/:huertoId/sincronizar', workflow(async(client,user,garden,req,env)=>{
    await synchronize(client,user,garden,env)
    return panel(client,user,garden,env)
  }))
  router.post('/huerto/:huertoId/zonas', workflow((client,user,garden,req,env)=>createZone(client,user,garden,req.body,env)))
  router.post('/huerto/:huertoId/ciclos', workflow((client,user,garden,req,env)=>startCycle(client,user,garden,req.body,env)))
  router.put('/huerto/:huertoId/cultivos/configuracion', workflow((client,user,garden,req)=>configureCrop(client,user,garden,req.body)))
  router.post('/huerto/:huertoId/cultivos/finalizar', workflow((client,user,garden,req,env)=>finalizeCrop(client,user,garden,req.body,env)))
  router.post('/huerto/:huertoId/programar', workflow((client,user,garden,req,env)=>schedule(client,user,garden,req.body,env)))
  router.post('/huerto/:huertoId/siembras', workflow((client,user,garden,req,env)=>sow(client,user,garden,req.body,env)))
  router.post('/huerto/:huertoId/secados', workflow((client,user,garden,req,env)=>startDrying(client,user,garden,req.body,env)))
  router.post('/huerto/:huertoId/tareas/:tareaId/completar', workflow((client,user,garden,req,env)=>finish(client,user,garden,req.params.tareaId,req.body,env)))
  router.post('/huerto/:huertoId/riegos', taskMutationHandler(runTransaction,
    (client, user, garden, _task, body) => recordWatering(client, user, garden, body)))
  router.post('/huerto/:huertoId/tareas/:tareaId/inscribirse', taskMutationHandler(runTransaction, enrollTask))
  router.get('/:usuarioId?', real.realOrDemo(real.getRecordatorios, getRecordatorios))
  router.post('/:id/completar', real.realOrDemo(real.completarRecordatorio, completarRecordatorio))

  return router
}

export default createRecordatoriosRouter()
