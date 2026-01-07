import { JwtPayload } from '@sustainpro/shared-types';

// Extend Express Request type globally
declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}

export { };
