import { createLogger, format, transports } from 'winston'
import 'winston-daily-rotate-file'
const { combine, timestamp } = format

export const logging = createLogger({
  format: combine(
    timestamp(),
    format.json()
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'error.log', level: 'info' }),
    new transports.DailyRotateFile({
      level: 'info',
      filename: 'application-%DATE%.log',
      maxFiles: '7d'
    })
  ],

})