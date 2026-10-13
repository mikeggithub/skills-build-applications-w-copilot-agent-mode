import { Types } from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

export async function listActivities() {
  return Activity.find().lean();
}

export async function createActivity(input: unknown) {
  if (
    !input ||
    typeof input !== 'object' ||
    !('userId' in input) ||
    !('teamId' in input) ||
    !('type' in input) ||
    !('minutes' in input)
  ) {
    throw Object.assign(new Error('Activity requires userId, teamId, type, and minutes'), { status: 400 });
  }
  const { userId, teamId } = input as { userId: unknown; teamId: unknown };
  if (
    typeof userId !== 'string' ||
    !Types.ObjectId.isValid(userId) ||
    typeof teamId !== 'string' ||
    !Types.ObjectId.isValid(teamId)
  ) {
    throw Object.assign(new Error('Activity userId and teamId must be valid IDs'), { status: 400 });
  }
  const [userExists, teamExists] = await Promise.all([
    User.exists({ _id: userId }),
    Team.exists({ _id: teamId }),
  ]);
  if (!userExists || !teamExists) {
    throw Object.assign(new Error('Activity user and team must exist'), { status: 400 });
  }
  const { type, minutes } = input as { type: unknown; minutes: unknown };
  if (typeof type !== 'string' || !type.trim() || typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0) {
    throw Object.assign(new Error('Activity type and positive minutes are required'), { status: 400 });
  }
  return Activity.create({
    user: userId,
    team: teamId,
    type: type.trim(),
    minutes,
    points: minutes,
    occurredAt: new Date(),
  });
}

export async function listTeams() {
  return Team.find().lean();
}

export async function createTeam(input: unknown) {
  if (!input || typeof input !== 'object' || !('name' in input) || !('mascot' in input)) {
    throw Object.assign(new Error('Team name and mascot are required'), { status: 400 });
  }
  const { name, mascot, members = [] } = input as { name: unknown; mascot: unknown; members?: unknown };
  if (typeof name !== 'string' || !name.trim() || typeof mascot !== 'string' || !mascot.trim() || !Array.isArray(members)) {
    throw Object.assign(new Error('Team name, mascot, and members are invalid'), { status: 400 });
  }
  if (members.some((memberId) => typeof memberId !== 'string' || !Types.ObjectId.isValid(memberId))) {
    throw Object.assign(new Error('Team members must be valid user IDs'), { status: 400 });
  }
  if (members.length > 0) {
    const memberCount = await User.countDocuments({ _id: { $in: members } });
    if (memberCount !== new Set(members).size) {
      throw Object.assign(new Error('Team members must exist'), { status: 400 });
    }
  }
  return Team.create({ name: name.trim(), mascot: mascot.trim(), members });
}

export async function getLeaderboard() {
  const [teams, activityTotals] = await Promise.all([
    Team.find().select('_id name').lean(),
    Activity.aggregate<{ _id: Types.ObjectId; totalPoints: number }>([
      { $group: { _id: '$team', totalPoints: { $sum: '$points' } } },
    ]),
  ]);
  const totalsByTeam = new Map(activityTotals.map(({ _id, totalPoints }) => [_id.toString(), totalPoints]));
  return teams
    .map((team) => ({ teamName: team.name, totalPoints: totalsByTeam.get(team._id.toString()) ?? 0 }))
    .sort((left, right) => right.totalPoints - left.totalPoints || left.teamName.localeCompare(right.teamName))
    .map((team, index) => ({ ...team, rank: index + 1 }));
}

export async function suggestWorkouts(userEmail: string) {
  const user = await User.findOne({ email: userEmail }).lean();
  if (!user) {
    throw Object.assign(new Error('User not found'), { status: 404 });
  }
  const [recentActivity, workouts] = await Promise.all([
    Activity.findOne({ user: user._id }).sort({ occurredAt: -1 }).lean(),
    Workout.find().lean(),
  ]);
  const goal = user.fitnessGoal.trim().toLowerCase();
  const recentType = recentActivity?.type.toLowerCase();
  const activityFocus = recentType === 'run' || recentType === 'cycle' || recentType === 'walk'
    ? 'endurance'
    : recentType;
  const hasGoalMatch = workouts.some((workout) => workout.focus.toLowerCase() === goal);
  const preferredFocus = hasGoalMatch ? goal : activityFocus;
  return workouts
    .sort((left, right) => Number(right.focus.toLowerCase() === preferredFocus) - Number(left.focus.toLowerCase() === preferredFocus))
    .map((workout) => ({
      ...workout,
      reason: workout.focus.toLowerCase() === goal
        ? `Recommended for your ${user.fitnessGoal} fitness goal.`
        : workout.focus.toLowerCase() === activityFocus
          ? `Recommended based on your recent ${recentActivity?.type} activity.`
          : `Recommended as another option for your ${user.fitnessGoal} goal.`,
    }));
}

export { User };
