async function getInput(prompt: string) {
  process.stdout.write(prompt)
  for await (const line of console) {
    return line
  }
  return ""
}

async function continuep() {
  const response = await getInput("Continue? [Y/n] ")
  return response.toLowerCase() !== "n"
}

export { continuep }
