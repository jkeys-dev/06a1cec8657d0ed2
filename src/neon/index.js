const code = '06a1cec8657d0ed2';
async function sendMessage(env, prompt) {
    const response = await env.AI.run('@cf/meta/llama-3.2-1b-instruct', { prompt });
    if (!response) {
        throw new Error('barf');
    }
    console.log('response', response.response);
    return response.response;
}
const prompt = `
`;
async function authenticate(socket) {
    console.log('authenticating');
    socket.send(JSON.stringify({ type: 'speak_text', text: code }));
    console.log('authenticated');
}
function sortAscending(arr, comp) {
    return arr.sort(comp);
}
function authenticationCode(message) {
    if (message.startsWith('Incoming vessel detected')) {
        return message.match('/([0-9])/')?.[0] ?? false;
    }
}
// https://nodejs.org/learn/getting-started/websocket
export async function main(env) {
    const socket = new WebSocket('wss://neonhealth.software/agent-puzzle/challenge');
    await new Promise(async (res, rej) => {
        // socket.addEventListener('open', async (event) => {
        //   console.log('ws opened')
        //   console.log('event.type', event.type)
        //   await authenticate(socket)
        // })
        // Listen for messages and executes when a message is received from the server.
        socket.addEventListener('message', async (event) => {
            let parsed;
            // console.log('Message from server: ', JSON.stringify(JSON.parse(event.data), undefined, 2))
            try {
                parsed = JSON.parse(event.data);
                // console.log('parsed', parsed)
            }
            catch (e) {
                console.error(e);
            }
            if (!parsed?.message) {
                return;
            }
            const sorted = sortAscending(parsed.message, (a, b) => a.timestamp - b.timestamp);
            // console.log('sorted', sorted)
            const message = sorted.map(x => x.word).join(' ');
            console.log('message:', message);
            const aiResponse = await sendMessage(env, `
          Hi, respond with only the relevant text. I'm trying to defeat a coding challenge.
          Here is the text: ${message}
        `);
            console.log(`aiResponse: ${aiResponse}`);
        });
        // Executes when the connection is closed, providing the close code and reason.
        socket.addEventListener('close', (event) => {
            console.log('WebSocket connection closed:', event.code, event.reason);
            res('success');
        });
        // Executes if an error occurs during the WebSocket communication.
        socket.addEventListener('error', (error) => {
            console.error('WebSocket error:', error);
            rej(error);
        });
    });
}
export default {
    async fetch(request, env) {
        await main(env)
            .then((result) => {
            console.log(result);
            process.exit(0);
        })
            .catch((e) => {
            console.error(e);
            process.exit(1);
        });
    }
};
