// Auto-close issues/PRs from accounts younger than a minimum age.
//
// Inputs:
//   `MIN_AGE_DAYS`: minimum account age in days (default: 30)

module.exports = async ({ github, context }) => {
  const minAgeDays = parseInt(process.env.MIN_AGE_DAYS || "30", 10);

  const isPR = !!context.payload.pull_request;
  const target = isPR ? context.payload.pull_request : context.payload.issue;
  const author = target.user.login;

  let user;
  try {
    ({ data: user } = await github.rest.users.getByUsername({
      username: author,
    }));
  } catch {
    console.log(`Could not fetch user @${author}, skipping`);
    return;
  }

  const createdAt = new Date(user.created_at);
  const now = new Date();
  const ageDays = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));

  console.log(`@${author} created ${user.created_at} (${ageDays}d ago)`);

  if (ageDays >= minAgeDays) {
    console.log(`Account age OK (${ageDays}d >= ${minAgeDays}d)`);
    return;
  }

  console.log(`Account too new (${ageDays}d < ${minAgeDays}d)`);

  const noun = isPR ? "pull request" : "issue";
  const body =
    `This ${noun} has been automatically closed because ` +
    `@${author}'s account is less than ${minAgeDays} days old ` +
    `(created ${ageDays} days ago). This is an automated policy ` +
    `to reduce spam. If this was a mistake, please leave a comment ` +
    `explaining why, and a maintainer will take a look.`;

  await github.rest.issues.createComment({
    ...context.repo,
    issue_number: target.number,
    body,
  });

  if (isPR) {
    await github.rest.pulls.update({
      ...context.repo,
      pull_number: target.number,
      state: "closed",
    });
  } else {
    await github.rest.issues.update({
      ...context.repo,
      issue_number: target.number,
      state: "closed",
      state_reason: "not_planned",
    });
  }

  console.log(`Closed ${noun} #${target.number}`);
};
