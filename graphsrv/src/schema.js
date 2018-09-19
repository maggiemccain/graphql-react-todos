import Users from './data/users';
import Todos from './data/todos';
import find from 'lodash/find';
import filter from 'lodash/filter';
import sumBy from 'lodash/sumBy';
import {
    GraphQLInt,
    GraphQLBoolean,
    GraphQLString,
    GraphQLList,
    GraphQLObjectType,
    GraphQLNonNull,
    GraphQLSchema,
    GraphQLID,
} from 'graphql';
import config from '../config.js';
var mongoose = require('mongoose');

var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var username = config.USERNAME;
var pword = config.PWORD;

// database

// Mongoose Schema definition
var TODO = mongoose.model('Todo', new Schema({
    id: mongoose.Schema.Types.ObjectId,
    title: String,
    completed: Boolean,
    user: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
  }));

var USER = mongoose.model('User', new Schema({
    id: mongoose.Schema.Types.ObjectId,
    first_name: String,
    last_name: String,
    email: String,
    gender: String,
    department: String,
    country: String,
    todo_count: Number,
    todos: [{type: mongoose.Schema.Types.ObjectId, ref: 'Todo'}],
}));



//Set up default mongoose connection
// HIDE USERNAME AND PASSWORD
var mongoDB = `mongodb://${username}:${pword}@ds261072.mlab.com:61072/graphql_todos`;
mongoose.connect(mongoDB, (error) => {
    if (error) console.error(error)
    else console.log('mongo connected')
});
// Get Mongoose to use the global promise library
mongoose.Promise = global.Promise;
//Get the default connection
var db = mongoose.connection;
// graphql

const UserType = new GraphQLObjectType({
    name: 'User',
    description: 'Users in company',
    fields: () => ({
            id: {type: new GraphQLNonNull(GraphQLID)},
            first_name: {type: new GraphQLNonNull(GraphQLString)},
            last_name: {type: new GraphQLNonNull(GraphQLString)},
            email: {type: GraphQLString},
            gender: {type: GraphQLString},
            department: {type: new GraphQLNonNull(GraphQLString)},
            country: {type: new GraphQLNonNull(GraphQLString)},
            todo_count: {
                type: GraphQLInt,
                resolve: (user) => {
                    return sumBy(Todos, todo => todo.userId === user.id ? 1:0);
                }
            },
            todos: {
                type: new GraphQLList(TodoType),
                resolve: (user, args) => {
                    return filter(Todos, todo => todo.userId === user.id);
                }
            }
        })
});

const TodoType = new GraphQLObjectType({
    name: 'Todo',
    description: 'Task for user',
    fields: () => ({
            id: {type: new GraphQLNonNull(GraphQLID)},
            title: {type: GraphQLString},
            completed: {type: new GraphQLNonNull(GraphQLBoolean)},
            user: {
                type: UserType,
                resolve: (todo, args) => {
                    return find(Users, user => user.id === todo.userId);
                }
            }
        })
});

const TodoQueryRootType = new GraphQLObjectType({
    name: 'TodoAppSchema',
    description: 'Root Todo App Schema',
    fields: () => ({
        users: {
            args: {
                first_name: {type: GraphQLString},
                last_name: {type: GraphQLString},
                department: {type: GraphQLString},
                country: {type: GraphQLString},
            },
            type: new GraphQLList(UserType),
            description: 'List of Users',
            resolve: (parent, args) => {
                return USER.find({})
            }
        },
        todos: {
            args: {
                userId: {type: GraphQLInt},
                completed: {type: GraphQLBoolean},
            },
            type: new GraphQLList(TodoType),
            description: 'List of Todos',
            resolve: (parent, args) => {
                if (Object.keys(args).length) {
                    return filter(Todos, args);
                }
                return Todos;
            }
        }
    })
});

const TodoMutation = new GraphQLObjectType({
    name: 'TodoMutations',
    description: 'writing to the todos or users',
    fields: () => ({
        updateCompletionStatus: {
            args: {
                id: {type: GraphQLInt},
            },
            type: TodoType,
            description: 'Change status of single Todo',
            resolve: (parent, args) => {
                const todo = find(Todos, todo => todo.id === args.id);
                todo.completed = !todo.completed;
                return todo;
            }
        },
        addUser: {
            args: {
                first_name: {type: new GraphQLNonNull(GraphQLString)},
                last_name: {type: new GraphQLNonNull(GraphQLString)},
                email: {type: GraphQLString},
                gender: {type: GraphQLString},
            },
            type: UserType,
            description: 'Create new user',
            resolve: (parent, args) => {
                var newUser = new USER({
                  first_name: args.first_name,
                  last_name: args.last_name,
                  email: args.email,
                  gender: args.gender,
                  department: 'Legal',
                  country: 'United States',
                })
                newUser.id = newUser._id
                return new Promise((resolve, reject) => {
                  newUser.save(function (err) {
                    if (err) reject(err)
                    else resolve(newUser)
                  })
                })
            }
        },
        addTodo: {
            args: {
                title: {type: GraphQLString},
                first_name: {type: GraphQLString},
                // last_name: {type: GraphQLString},
            },
            type: TodoType,
            description: 'Create new todo',
            resolve: (parent, args) => {
                var newTodo = new TODO({
                    title: args.title,
                    completed: false,
                    user: USER.findOne({first_name: args.first_name}).select('id') // not working
                })
                newTodo.id = newTodo._id
                return new Promise((resolve, reject) => {
                  newTodo.save(function (err) {
                    if (err) reject(err)
                    else resolve(newTodo)
                  })
                })
            }
        },
    })
});

const schema = new GraphQLSchema({
    query: TodoQueryRootType,
    mutation: TodoMutation,
});

export default schema;
