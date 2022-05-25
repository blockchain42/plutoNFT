const Koa = require('koa');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');
const cors = require('@koa/cors');

async function server({ port }) {
  try {
    const app = new Koa()
      .use(cors({ origin: '*' }))
      .use((ctx, next) => {
        if (ctx.path !== '/health') return next();
        ctx.body = { Status: 'OK' };
      })
      .use(bodyParser({ jsonLimit: '50mb' }))
      .use(router());

    const httpServer = await new Promise((resolve, reject) => {
      const server = app
        .listen(port)
        .on('error', reject)
        .on('listening', () => {
          port = server.address().port;
          resolve(server);
        });
    });

    return httpServer;
  } catch (e) {
    console.log(e);
  }
}

function router() {
  return new Router({ prefix: '/benefits/recipients/push' })
    .post('/', create)
    .routes();
}

async function create(ctx) {
  let body = ctx.request.body;

  console.log('post was successful');
  ctx.status = 200;
}

module.exports = server;
