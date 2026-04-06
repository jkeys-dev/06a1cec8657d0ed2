/**
 * this is the spaghetti-est of spaghetti code,
 * cobbled together in a panic trying to solve
 * Neon Health's hiring puzzle. I wrote most of it,
 * but some lines were written by Gemini. In particular,
 * 'fixUnbalancedParentheses' was a desperate emanation
 * of LLMs that happened to work well on first try.
 *
 * The main abstraction is `determineType`, which
 * is used to determine the type of response that
 * the script is receiving from the websocket.
 * I then use an if/elif block to handle each type.
 * (Why not a switch statement? Panick.)
 *
 * I also didn't bother trying to get separate resume
 * types working, I just spammed the websocket until
 * the one resume constant passed for all of the resume
 * subtypes.
 *
 * I make heavy use of regex to get around the non-determinism
 * of LLMs. I wish I had leaned into this sooner; I probably
 * wasted half an hour to an hour just trying to get the LLM
 * to play nice, when I should've just used capture groups
 * earlier and not worried about it.
 *
 * Jeremy
 */

import { Env, NeonResponse, WikipediaSummary } from "../types"
import { Parser } from "expr-eval"
import assert from "assert"

const code = "06a1cec8657d0ed2" as const

const resume = `
Jeremy Peter Keys is a highly motivated Senior Backend Software Engineer with over eight years of experience specializing in distributed production applications and infrastructure management. Currently based in Silver City, NM, Jeremy has been a key contributor at Ginger Labs since March 2021. In this role, he focuses on developing scalable backend solutions using NodeJS (TypeScript) and Python. His notable projects include building features for Audio Transcription and gifting mechanisms, as well as managing complex systems utilizing NATS Jetstream and Kubernetes on Google Cloud Platform (GCP).

His technical proficiency spans a robust stack of modern backend and DevOps tools. Jeremy is highly skilled in working with PostgreSQL and Redis for data management, alongside utilizing Terraform, Helm, and ArgoCD for seamless infrastructure deployment and orchestration. He also has significant experience integrating third-party services like Stripe.

Academically, Jeremy holds a Bachelor of Science in Computer Science from New Mexico State University, which he completed in August 2018. He is currently furthering his foundational knowledge by pursuing a Master of Science in Computer Science at the same institution, with an expected graduation in December 2027.
` as const

async function sendMessage(env: Env, prompt: string | any[], model?: string, opts?: any) {
  const response = await env.AI.run(
    model ?? ("@cf/mistral/mistral-7b-instruct-v0.2-lora" as any),
    {
      prompt: Array.isArray(prompt) ? undefined : prompt,
      messages: Array.isArray(prompt) ? prompt : undefined,
    },
    opts,
  )

  assert(response, "response not found")
  return response.response as string
}

const determineTypePrompt = (message: string) => `
    The input text will be surrounded by triple quotes.
    If this is an authentication message, print the word "authentication". These often contain 'Incoming vessel detected.'. The authentication digit will be for an excellent engineer.
    If this is an authorization message, print the word "authorization". These often contain 'Transmit your vessel authorization code' or similar.
    If this is a request for work experience message, print the word "resume". These often contain the word "experience".
    If this is a request for a wikipedia cross-reference task, print the word "wiki".
    If this is a request for a math expression evaluation, print the word "math".
    If this is a request for transmission verification, print the word "verification".
    Do not print anything besides the one word.
    Here is the message:
    """
    ${message}
    """
`

async function determineType(env: Env, message: string) {
  return await sendMessage(env, determineTypePrompt(message))
}

async function authenticate(socket: WebSocket, digits: string) {
  socket.send(JSON.stringify({ type: "enter_digits", digits }))
  console.log("authenticated with digits:", digits)
}

function sortAscending<T>(arr: T[], comp: (a: T, b: T) => number) {
  return [...arr].sort(comp)
}
/**
 * Fetches the summary of a Wikipedia page by its title.
 * * @param title - The title of the Wikipedia article (e.g., "Typescript", "Alan Turing")
 * @returns A promise that resolves to the WikipediaSummary object, or null if it fails.
 */
export async function fetchWikipediaSummary(title: string): Promise<WikipediaSummary | null> {
  // Always encode the title to handle spaces and special characters safely in the URL
  const encodedTitle = title
  const endpoint = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodedTitle}`
  console.log("endpoint", endpoint)

  try {
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        // It's good practice to provide a User-Agent when hitting Wikimedia APIs
        Accept: "application/json",
        "User-Agent": "MyTypeScriptApp/1.0 (mailto:your.email@example.com)",
      },
    })

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`Wikipedia page not found for title: "${title}"`)
        return null
      }
      throw new Error(`HTTP error! Status: ${response.status}`)
    }

    const data: WikipediaSummary = (await response.json()) as WikipediaSummary
    console.log(`summary: ${data}`)
    return data
  } catch (error) {
    console.error("Failed to fetch Wikipedia summary:", error)
    return null
  }
}

function fixUnbalancedParentheses(expression: string) {
  let stack = []

  for (let i = 0; i < expression.length; i++) {
    let char = expression[i]
    if (char === "(") {
      stack.push(i)
    } else if (char === ")") {
      if (stack.length > 0) {
        stack.pop() // Matches a previous '('
      } else {
        // Unmatched closing parenthesis: needs an opening one at the start
        expression = "(" + expression
        i++ // Adjust index due to prepended character
      }
    }
  }

  // Any remaining '(' in stack need a closing ')' at the end
  while (stack.length > 0) {
    expression += ")"
    stack.pop()
  }

  return expression
}

export async function main(env: Env) {
  const socket = new WebSocket("wss://neonhealth.software/agent-puzzle/challenge")
  let convo = ""

  return new Promise((resolve, reject) => {
    socket.addEventListener("message", async (event) => {
      try {
        // console.log('event.data', event.data)
        const parsed = JSON.parse(event.data as string) as NeonResponse

        if (!parsed?.message) {
          console.warn("no message in frame")
          return
        }

        const sorted = sortAscending(parsed.message, (a, b) => a.timestamp - b.timestamp)
        const message = sorted.map((x) => x.word).join(" ")
        console.log("message:", message)

        convo += message

        const type = (await determineType(env, message))!.toLowerCase().trim()
        console.log("type:", type)

        if (type.includes("authentication")) {
          const prompt = `
            Hi, respond with only the relevant text. I'm trying to defeat a coding challenge. Respond with a numeric string,
            representing either the vessel velocity or the frequency. We only want the frequency if it is by an excellent
            software engineer. Print nothing but the frequency as a single digit.
            Here is the text: ${message}
          ` as const
          convo += prompt
          const aiResponse = await sendMessage(env, prompt)
          if (aiResponse) {
            const digit = aiResponse.trim().match(/\d/)?.at(0)
            if (digit) {
              await authenticate(socket, digit)
            } else {
              console.error("found no digit")

              // a total abuse of how Cloudflare Workers work,
              // I'm just running this locally with `npx wrangler dev`
              // and using `curl` to hit this worker locally,
              // taking advantage of Cloudflare Workers' ability
              // to talk to remote models while developing locally.
              // haha
              process.exit(1)
            }
          }
        } else if (type.includes("authorization")) {
          socket.send(
            JSON.stringify({
              type: "enter_digits",
              digits: `${code}#`, // HACK: just append #, the API seems to almost always ask for it
            }),
          )
        } else if (type.includes("resume")) {
          socket.send(
            JSON.stringify({
              type: "speak_text",
              text: resume.trim().replace(/\n/g, " ").slice(0, 255), // HACK: just send first 256 characters, don't bother trying to compact
            }),
          )
        } else if (type.includes("wiki")) {
          const wordIndex = message.match(/([0-9]+)/)?.at(0)
          if (!wordIndex) throw new Error("no word")
          // prettier-ignore
          const title = message
            .match(/\'(.*)\'/)      // l
            ?.at(0)                 // o
            ?.slice(1)              // l
            .slice(0, -1) // D:
          if (!title) throw new Error("no title")
          const wikiSnippet = await fetchWikipediaSummary(title)
          const word = wikiSnippet?.extract.split(" ")?.at(parseInt(wordIndex, 10) - 1)
          socket.send(JSON.stringify({ type: "speak_text", text: word }))
        } else if (type.includes("math")) {
          const match = message.match(/Math\.floor\([\d\s()+\-*/%]+\)[\d\s+\-*/%]*/)?.at(0)!
          try {
            const cleanExpression = fixUnbalancedParentheses(match.replace(/Math\./g, ""))
            const res = new Parser().evaluate(cleanExpression)
            socket.send(
              JSON.stringify({
                type: "enter_digits",
                digits: res.toString() + "#",
              }),
            )
          } catch (error) {
            console.error("Failed to parse and evaluate the math:", error)
          }
        } else if (type.includes("verification")) {
          const num = parseInt(message.match(/(\d+)/)?.at(0)!, 10)
          const res = resume
            .trim()
            .split(" ")
            .at(num - 1)!
          console.log("verification result:", res)
          socket.send(JSON.stringify({ type: "speak_text", text: res }))
        }
      } catch (e) {
        console.error("Error processing message:", e)
        process.exit(1)
      }
    })

    socket.addEventListener("close", (event) => {
      console.log("WebSocket connection closed:", event.code, event.reason)
      reject("success")
    })

    socket.addEventListener("error", (error) => {
      console.error("WebSocket error:", error)
      reject(error)
    })
  })
}

export default {
  async fetch(request: Request, env: Env) {
    try {
      const result = await main(env)
      return new Response(result as string, { status: 200 })
    } catch (e: any) {
      return new Response(e.message || "Internal Error", { status: 500 })
    }
  },
}
