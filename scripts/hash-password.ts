// Prints a scrypt hash for the server config. Reads stdin so the password stays out of argv/history.
import { createInterface } from 'node:readline'
import { hashPassword } from '../apps/server/src/passwords.ts'

const fromArgv = process.argv[2]
if (fromArgv) {
  console.error('warning: a password on the command line lands in shell history')
  console.log(hashPassword(fromArgv))
} else {
  const readline = createInterface({ input: process.stdin, output: process.stderr })
  readline.question('Password: ', (password) => {
    readline.close()
    if (!password) {
      console.error('empty password')
      process.exit(1)
    }
    console.log(hashPassword(password))
  })
}
