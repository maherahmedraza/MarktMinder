import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { ValidationError } from '../utils/errors.js';

/**
 * Validation middleware factory
 * Runs validation chains and formats errors
 */
export function validate(validations: ValidationChain[]) {
    return async (req: Request, res: Response, next: NextFunction) => {
        // Run all validations
        await Promise.all(validations.map((validation) => validation.run(req)));

        // Check for errors
        const errors = validationResult(req);

        if (errors.isEmpty()) {
            return next();
        }

        // Format errors
        const formattedErrors = errors.array().map((err) => {
            if (err.type === 'field') {
                return {
                    field: err.path,
                    message: err.msg,
                    value: err.value,
                };
            }
            return {
                message: err.msg,
            };
        });

        next(new ValidationError('Validation failed', formattedErrors));
    };
}

export default validate;
