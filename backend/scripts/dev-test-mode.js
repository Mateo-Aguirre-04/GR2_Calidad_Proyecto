// Arranca el backend con las restricciones temporales relajadas para pruebas manuales.
if (process.env.NODE_ENV === 'production') throw new Error('El modo de prueba solo se puede iniciar en desarrollo.')
process.env.NODE_ENV ||= 'development'
process.env.CHECKLIST_IGNORE_TIME_RESTRICTIONS = 'true'
await import('../src/server.js')
