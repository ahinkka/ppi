module.exports = {
    'env': {
        'browser': true,
        'es6': true
    },
    'extends': ['eslint:recommended' , 'plugin:react/recommended'],
    'globals': {
        'Atomics': 'readonly',
        'SharedArrayBuffer': 'readonly'
    },
    "parser": "@typescript-eslint/parser",
    'parserOptions': {
        'ecmaFeatures': {
            'jsx': true
        },
        'ecmaVersion': 2018,
        'sourceType': 'module',
        'project': './tsconfig.json'
    },
    'plugins': [
        'react',
        '@typescript-eslint'
    ],
    'rules': {
        'indent': [
            'error',
            2
        ],
        'linebreak-style': [
            'error',
            'unix'
        ],
        'quotes': [
            'error',
            'single'
        ],
        'no-console': [
	    'error', { allow: ['warn', 'error'] }
	],
        'react/prop-types': [
	    'off'
	],
    }
}
