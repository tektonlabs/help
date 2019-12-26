// @flow
import uuid from 'uuid';
import Router from 'koa-router';
import format from 'date-fns/format';
import { Op } from '../sequelize';
import {
  makePolicy,
  getSignature,
  publicS3Endpoint,
  makeCredential,
} from '../utils/s3';
import { ValidationError } from '../errors';
import { Event, User, Team } from '../models';
import auth from '../middlewares/authentication';
import pagination from './middlewares/pagination';
import userInviter from '../commands/userInviter';
import { presentUser } from '../presenters';
import policy from '../policies';

const { authorize } = policy;
const router = new Router();

router.post('users.list', auth(), pagination(), async ctx => {
  const { query } = ctx.body;
  const user = ctx.state.user;

  let where = {
    teamId: user.teamId,
  };

  if (query) {
    where = {
      ...where,
      name: {
        [Op.iLike]: `%${query}%`,
      },
    };
  }

  const users = await User.findAll({
    where,
    order: [['createdAt', 'DESC']],
    offset: ctx.state.pagination.offset,
    limit: ctx.state.pagination.limit,
  });

  ctx.body = {
    pagination: ctx.state.pagination,
    data: users.map(listUser =>
      presentUser(listUser, { includeDetails: user.isAdmin })
    ),
  };
});

router.post('users.info', auth(), async ctx => {
  ctx.body = {
    data: presentUser(ctx.state.user),
  };
});

router.post('users.update', auth(), async ctx => {
  const { user } = ctx.state;
  const { name, avatarUrl } = ctx.body;
  const endpoint = publicS3Endpoint();

  if (name) user.name = name;
  if (avatarUrl && avatarUrl.startsWith(`${endpoint}/uploads/${user.id}`)) {
    user.avatarUrl = avatarUrl;
  }

  await user.save();

  ctx.body = {
    data: presentUser(user, { includeDetails: true }),
  };
});

router.post('users.s3Upload', auth(), async ctx => {
  const { filename, kind, size } = ctx.body;
  ctx.assertPresent(filename, 'filename is required');
  ctx.assertPresent(kind, 'kind is required');
  ctx.assertPresent(size, 'size is required');

  const s3Key = uuid.v4();
  const key = `uploads/${ctx.state.user.id}/${s3Key}/${filename}`;
  const credential = makeCredential();
  const longDate = format(new Date(), 'YYYYMMDDTHHmmss\\Z');
  const policy = makePolicy(credential, longDate);
  const endpoint = publicS3Endpoint();
  const url = `${endpoint}/${key}`;

  await Event.create({
    name: 'user.s3Upload',
    data: {
      filename,
      kind,
      size,
      url,
    },
    teamId: ctx.state.user.teamId,
    userId: ctx.state.user.id,
    ip: ctx.request.ip,
  });

  ctx.body = {
    data: {
      maxUploadSize: process.env.AWS_S3_UPLOAD_MAX_SIZE,
      uploadUrl: endpoint,
      form: {
        'Cache-Control': 'max-age=31557600',
        'Content-Type': kind,
        acl: 'public-read',
        key,
        policy,
        'x-amz-algorithm': 'AWS4-HMAC-SHA256',
        'x-amz-credential': credential,
        'x-amz-date': longDate,
        'x-amz-signature': getSignature(policy),
      },
      asset: {
        contentType: kind,
        name: filename,
        url,
        size,
      },
    },
  };
});

// Admin specific

router.post('users.promote', auth(), async ctx => {
  const userId = ctx.body.id;
  const teamId = ctx.state.user.teamId;
  ctx.assertPresent(userId, 'id is required');

  const user = await User.findByPk(userId);
  authorize(ctx.state.user, 'promote', user);

  const team = await Team.findByPk(teamId);
  await team.addAdmin(user);

  await Event.create({
    name: 'users.promote',
    actorId: ctx.state.user.id,
    userId,
    teamId,
    data: { name: user.name },
    ip: ctx.request.ip,
  });

  ctx.body = {
    data: presentUser(user, { includeDetails: true }),
  };
});

router.post('users.demote', auth(), async ctx => {
  const userId = ctx.body.id;
  const teamId = ctx.state.user.teamId;
  ctx.assertPresent(userId, 'id is required');

  const user = await User.findByPk(userId);
  authorize(ctx.state.user, 'demote', user);

  const team = await Team.findByPk(teamId);
  try {
    await team.removeAdmin(user);
  } catch (err) {
    throw new ValidationError(err.message);
  }

  await Event.create({
    name: 'users.demote',
    actorId: ctx.state.user.id,
    userId,
    teamId,
    data: { name: user.name },
    ip: ctx.request.ip,
  });

  ctx.body = {
    data: presentUser(user, { includeDetails: true }),
  };
});

router.post('users.suspend', auth(), async ctx => {
  const admin = ctx.state.user;
  const userId = ctx.body.id;
  const teamId = ctx.state.user.teamId;
  ctx.assertPresent(userId, 'id is required');

  const user = await User.findByPk(userId);
  authorize(ctx.state.user, 'suspend', user);

  const team = await Team.findByPk(teamId);
  try {
    await team.suspendUser(user, admin);
  } catch (err) {
    throw new ValidationError(err.message);
  }

  await Event.create({
    name: 'users.suspend',
    actorId: ctx.state.user.id,
    userId,
    teamId,
    data: { name: user.name },
    ip: ctx.request.ip,
  });

  ctx.body = {
    data: presentUser(user, { includeDetails: true }),
  };
});

router.post('users.activate', auth(), async ctx => {
  const admin = ctx.state.user;
  const userId = ctx.body.id;
  const teamId = ctx.state.user.teamId;
  ctx.assertPresent(userId, 'id is required');

  const user = await User.findByPk(userId);
  authorize(ctx.state.user, 'activate', user);

  const team = await Team.findByPk(teamId);
  await team.activateUser(user, admin);

  await Event.create({
    name: 'users.activate',
    actorId: ctx.state.user.id,
    userId,
    teamId,
    data: { name: user.name },
    ip: ctx.request.ip,
  });

  ctx.body = {
    data: presentUser(user, { includeDetails: true }),
  };
});

router.post('users.invite', auth(), async ctx => {
  const { invites } = ctx.body;
  ctx.assertPresent(invites, 'invites is required');

  const user = ctx.state.user;
  authorize(user, 'invite', User);

  const response = await userInviter({ user, invites, ip: ctx.request.ip });

  ctx.body = {
    data: {
      sent: response.sent,
      users: response.users.map(user => presentUser(user)),
    },
  };
});

router.post('users.delete', auth(), async ctx => {
  const { confirmation, id } = ctx.body;
  ctx.assertPresent(confirmation, 'confirmation is required');

  let user = ctx.state.user;
  if (id) user = await User.findByPk(id);
  authorize(ctx.state.user, 'delete', user);

  try {
    await user.destroy();
  } catch (err) {
    throw new ValidationError(err.message);
  }

  await Event.create({
    name: 'users.delete',
    actorId: user.id,
    userId: user.id,
    teamId: user.teamId,
    data: { name: user.name },
    ip: ctx.request.ip,
  });

  ctx.body = {
    success: true,
  };
});

export default router;
