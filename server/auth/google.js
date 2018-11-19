// @flow
import crypto from 'crypto';
import Router from 'koa-router';
import { capitalize } from 'lodash';
import { OAuth2Client } from 'google-auth-library';
import { User, Team } from '../models';
import auth from '../middlewares/authentication';

const router = new Router();
const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.URL}/auth/google.callback`
);
const allowedDomainsEnv = process.env.GOOGLE_ALLOWED_DOMAINS;

// start the oauth process and redirect user to Google
router.get('google', async ctx => {
  // Generate the url that will be used for the consent dialog.
  const authorizeUrl = client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
    prompt: 'consent',
  });
  ctx.redirect(authorizeUrl);
});

// signin callback from Google
router.get('google.callback', auth({ required: false }), async ctx => {
  const { code } = ctx.request.query;
  ctx.assertPresent(code, 'code is required');
  const response = await client.getToken(code);
  client.setCredentials(response.tokens);

  const profile = await client.request({
    url: 'https://www.googleapis.com/oauth2/v1/userinfo',
  });

  if (!profile.data.hd) {
    ctx.redirect('/?notice=google-hd');
    return;
  }

  // allow all domains by default if the env is not set
  const allowedDomains = allowedDomainsEnv && allowedDomainsEnv.split(',');
  if (allowedDomains && !allowedDomains.includes(profile.data.hd)) {
    ctx.redirect('/?notice=hd-not-allowed');
    return;
  }

  const googleId = profile.data.hd;
  const hostname = profile.data.hd.split('.')[0];
  const teamName = capitalize(hostname);

  // attempt to get logo from Clearbit API. If one doesn't exist then
  // fall back to using tiley to generate a placeholder logo
  const hash = crypto.createHash('sha256');
  hash.update(googleId);
  const hashedGoogleId = hash.digest('hex');
  const cbUrl = `https://logo.clearbit.com/${profile.data.hd}`;
  const tileyUrl = `https://tiley.herokuapp.com/avatar/${hashedGoogleId}/${
    teamName[0]
  }.png`;
  const cbResponse = await fetch(cbUrl);
  const avatarUrl = cbResponse.status === 200 ? cbUrl : tileyUrl;

  const [team, isFirstUser] = await Team.findOrCreate({
    where: {
      googleId,
    },
    defaults: {
      name: teamName,
      avatarUrl,
    },
  });

  const [user] = await User.findOrCreate({
    where: {
      service: 'google',
      serviceId: profile.data.id,
      teamId: team.id,
    },
    defaults: {
      name: profile.data.name,
      email: profile.data.email,
      isAdmin: isFirstUser,
      avatarUrl: profile.data.picture,
    },
  });

  if (isFirstUser) {
    await team.provisionFirstCollection(user.id);
    await team.provisionSubdomain(hostname);
  }

  // set cookies on response and redirect to team subdomain
  ctx.signIn(user, team, 'google');
});

export default router;
