import { createApp } from './app.js'
import { checkDbConnection } from './config/db.js'
import { createSessionStore } from './config/sessions.js'

await checkDbConnection()
const store = await createSessionStore()
const app = createApp(store)
const port = process.env.PORT || 3001
app.listen(port, () => console.log(`Huertos.ec API: http://localhost:${port}/api/health`))
