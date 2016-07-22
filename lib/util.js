'use strict';

const deepTraverse = function(obj, func) {
  Object.keys(obj)
    .forEach(key => {

      /* eslint no-invalid-this: 0 */
      func.apply(this, [key, obj[key], obj]);

      if (obj[key] !== null && typeof obj[key] === 'object') {
        deepTraverse(obj[key], func);
      }
    });
};

exports.deepTraverse = deepTraverse;
