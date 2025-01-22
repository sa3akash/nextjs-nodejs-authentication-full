import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { config } from '@root/config';
import { usersService } from '@services/db/users.service';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { userModel } from '@root/modules/users/users.model';
import { Strategy as GitHubStrategy } from 'passport-github';

const opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: config.JWT_SECRET!
};

// JWT Strategy for Passport
passport.use(
  new JwtStrategy(opts, async (payload, done) => {
    try {
      const user = await usersService.getUserById(payload.userId);
      if (!user) return done(null, false); // User not found
      return done(null, user); // Attach user to req.user
    } catch (err) {
      return done(err, false);
    }
  })
);

passport.use(
  new GoogleStrategy(
    {
      clientID: config.GOOGLE_CLIENT_ID!,
      clientSecret: config.GOOGLE_CLIENT_SECRET!,
      callbackURL: '/api/v1/auth/google/callback' // Adjust based on your route
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = (profile as any).email || profile.emails![0].value;
        const profilePicture = (profile as any).picture || profile.photos![0].value;

        // Find or create user in your database
        const user = await userModel.findOne({ $or: [{ googleId: profile.id }, { email }] });
        if (user) return done(null, user);

        const newUser = await userModel.create({
          googleId: profile.id,
          name: profile.displayName,
          email,
          provider: profile.provider,
          profilePicture,
          isVerified: Date.now()
        });

        return done(null, newUser);
      } catch (error) {
        return done(error, false, { message: 'Field to login' });
      }
    }
  )
);

passport.use(
  new GitHubStrategy(
    {
      clientID: config.GITHUB_CLIENT_ID!,
      clientSecret: config.GITHUB_CLIENT_SECRET!,
      callbackURL: '/api/v1/auth/github/callback' // Adjust based on your route
    },

    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = (profile as any).email;
        const profilePicture = (profile as any).avatar_url || profile.photos![0].value;
        //
        // // Find or create user in your database
        const user = await userModel.findOne({ $or: [{ githubId: profile.id }, { email: email }] });
        if (user) return done(null, user);
        //
        const newUser = await userModel.create({
          githubId: profile.id,
          name: profile.displayName,
          email,
          provider: profile.provider,
          profilePicture,
          isVerified: Date.now()
        });

        return done(null, newUser);
      } catch (error) {
        return done(error, false, { message: 'Field to login' });
      }
    }
  )
);

export default passport;
