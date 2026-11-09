const cultivoClave=c=>`${c.plantaId}:${c.fechaSiembra}`

// Los cultivos importados siguen en la base, pero el panel de pruebas muestra
// solo siembras registradas mediante el flujo actual del checklist.
export function cultivosDelChecklist(checklist) {
  const siembras=new Set((checklist.tareas||[])
    .filter(t=>t.actividad?.codigo==='siembra'&&t.completado&&t.cultivo)
    .map(t=>cultivoClave(t.cultivo)))
  return (checklist.cultivos||[]).filter(c=>siembras.has(cultivoClave(c)))
}
