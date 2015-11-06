var deepTraverse = function(obj, func) {
	for (var i in obj) {
		func.apply(this, [i, obj[i], obj]);  
        if (obj[i] !== null && typeof(obj[i]) == 'object') {
            deepTraverse(obj[i], func);
        }
    }
};

exports.deepTraverse = deepTraverse;