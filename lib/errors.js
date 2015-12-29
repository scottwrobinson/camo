'use strict';

/*
 * Base Camo error.
 * 
 * Adapted from es6-error package.
 */
class CamoError extends Error {
    constructor(message) {
        super(message);

        // Extending Error is weird and does not propagate `message`
        Object.defineProperty(this, 'message', {
            enumerable : false,
            value : message
        });

        Object.defineProperty(this, 'name', {
            enumerable : false,
            value : this.constructor.name,
        });

        if (Error.hasOwnProperty('captureStackTrace')) {
            Error.captureStackTrace(this, this.constructor);
            return;
        }

        Object.defineProperty(this, 'stack', {
            enumerable : false,
            value : (new Error(message)).stack,
        });
    }
}

/*
 * Error indicating document didn't pass validation.
 */
class ValidationError extends CamoError {
    constructor(message) {
        super(message);
    }
}

exports.CamoError = CamoError;
exports.ValidationError = ValidationError;