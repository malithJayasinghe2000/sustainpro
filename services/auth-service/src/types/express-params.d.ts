/**
 * Express 5 Type Compatibility Override
 * 
 * @types/express v5 changed ParamsDictionary to allow string[] values
 * (for wildcard route patterns like /user/*path). However, this project
 * only uses named params (:id, :eventId, etc.) which are always strings.
 * 
 * This override restores string-only params to avoid breaking controller usages.
 */
import 'express-serve-static-core';

declare module 'express-serve-static-core' {
    interface ParamsDictionary {
        [key: string]: string;
    }
}
