// The blog requires moderation and verified accounts regardless of dashboard overrides.
process.env.LOGIN = 'force';
process.env.COMMENT_AUDIT = 'true';
process.env.DISABLE_REGION = 'true';
process.env.DISABLE_USERAGENT = 'true';
process.env.SITE_NAME ||= '瑜瑜的博客';
process.env.SITE_URL = 'https://blog.yychess.top';
process.env.MARKDOWN_TEX = 'false';

// Vercel/Neon prefixes all integration variables when a custom prefix is selected.
const connection = process.env.DATABASE_URL || process.env.POSTGRES_URL
  || process.env.DATABASE_POSTGRES_URL || process.env.DATABASE_DATABASE_URL;
if (connection) {
  try {
    const database = new URL(connection);
    if (!['postgres:', 'postgresql:'].includes(database.protocol)) throw new Error();
    process.env.PG_DB = decodeURIComponent(database.pathname.slice(1));
    process.env.PG_USER = decodeURIComponent(database.username);
    process.env.PG_PASSWORD = decodeURIComponent(database.password);
    process.env.PG_HOST = database.hostname;
    process.env.PG_PORT = database.port || '5432';
    process.env.PG_SSL = 'true';
  } catch {
    throw new Error('数据库连接地址格式不正确，请检查 DATABASE_URL。');
  }
}

const Waline = require('@waline/vercel');

module.exports = Waline({
  plugins: [{
    middlewares: [async (ctx, next) => {
      const registering = ctx.method === 'POST' && /^\/(?:api\/)?user(?:\/|$)/.test(ctx.path);
      if (registering) {
        if (!process.env.SMTP_USER || !(process.env.SMTP_HOST || process.env.SMTP_SERVICE)) {
          ctx.status = 503;
          ctx.body = { errno: 503, errmsg: '邮箱验证服务尚未就绪，请稍后再注册。' };
          return;
        }
        // Keep initial registration restricted until the owner has claimed the first admin account.
        const owner = (process.env.OWNER_EMAIL || '').trim().toLowerCase();
        const email = String(ctx.post('email') || '').trim().toLowerCase();
        if (!owner || (process.env.REGISTRATION_OPEN !== 'true' && email !== owner)) {
          ctx.status = 403;
          ctx.body = { errno: 403, errmsg: '评论区正在准备中，暂未开放新用户注册。' };
          return;
        }
      }
      await next();
    }],
  }],
  preSave(comment) {
    if (typeof comment.comment !== 'string' || comment.comment.length > 3000) {
      return { errmsg: '评论不能超过 3000 个字符。' };
    }
  },
});
