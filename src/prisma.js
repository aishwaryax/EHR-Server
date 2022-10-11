import {
    Prisma
} from 'prisma-binding'

import {
    fragmentReplacements
} from './resolvers/index'

import config from 'config'

const prisma = new Prisma({
    typeDefs: 'src/generated/prisma.graphql', // Specify typedefs not datamodel
    endpoint: 'http://localhost:4466', // where prisma graphql api lives
    secret: config.get('prisma-secret'),
    fragmentReplacements
})

export {
    prisma as
    default
}