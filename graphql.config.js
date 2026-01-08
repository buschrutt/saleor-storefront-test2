module.exports = {
    schema: {
        'https://buschrutt-saleor-api.fly.dev/graphql/': {
            headers: {
                'Content-Type': 'application/json'
            }
        }
    },
    documents: ['**/*.graphql', '**/*.gql'],
    extensions: {
        endpoints: {
            default: {
                url: 'https://buschrutt-saleor-api.fly.dev/graphql/',
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        }
    }
};