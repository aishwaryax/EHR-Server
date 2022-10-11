import {
    GraphQLServer
} from 'graphql-yoga'

import {
    resolvers,
    fragmentReplacements
} from './resolvers/index'

import prisma from './prisma'
import allTypes from './schema/index'
const startup_debug = require('debug')('app:startup')

const server = new GraphQLServer({
    typeDefs: allTypes,
    resolvers,
    fragmentReplacements,
    context(request) {
        return {
            prisma,
            request
        }
    }
})

server.start((server_meta) => {
    startup_debug('Server is Up\n', server_meta)
})