import * as express from 'express';
import * as DB from './models';
import * as cors from 'cors';
import * as http from 'http';
import * as path from 'path';
import * as socketIO from 'socket.io';
import { Sequelize } from 'sequelize/types';
import logger from './logger';
import authRouter from './routes/auth';
import userRouter from './routes/user';
import friendRouter from './routes/friend';
import chatRouter from './routes/chat';
import Chatting from './models/Chatting';


const stopServer = async (server: http.Server, sequelize: Sequelize, signal?: string) => {
    logger.info(`Stopping server with signal: ${signal}`);
    await server.close();
    await sequelize.close();
    process.exit();
};

const runServer = async() => {
    const app = express();
    const sequelize = DB.init();
    app.set('port', process.env.PORT || 3001);
    app.use(express.json());
    app.use(cors());
    app.use('/api/auth', authRouter);
    app.use('/api/user', userRouter);
    app.use('/api/friend', friendRouter);
    app.use('/api/chat', chatRouter);
    app.get('/uploads/:fileName', (req, res) => {
        const fileName = req.params.fileName
        res.sendFile(path.join(__dirname, `../uploads/${fileName}`));
    });
    const server = http.createServer(app).listen(app.get('port'), () => {
        logger.info(`listening on port ${app.get('port')}...`);
    });
    await sequelize.authenticate()
    .then(() => { logger.info("Connected to DB successfully."); })
    .catch(e => {
        stopServer(server, sequelize);
        throw e;
    });
    await sequelize.sync();
    runSocketIo(server);
};

const runSocketIo = (server: http.Server) => {
    const io = socketIO.listen(server);
    io.on('connection', (socket) => {
        
        socket.on('disconnect', () => {
            logger.info("소켓 연결 해제");
        });
        socket.on('join', (room_id: string) => {
            socket.join(room_id);
            logger.info(`${room_id}에 들어감`);
        })
        socket.on('message', async(messageObj:MessageRequest) => {
            const {room_id, send_user_id, message} = messageObj;
            const savedMessage = await Chatting.create({
                room_id,
                send_user_id,
                message
            });
            const messageResponse = {
                id: savedMessage.id,
                room_id: room_id,
                send_user_id,
                message,
                created_at: savedMessage.created_at,
            }
            if(messageObj.type === "individual"){
                const me = messageObj.send_user_id.toString();
                const target = messageObj.participant[0].id.toString();
                if(me !== target){
                    io.to(me).emit('message', messageResponse);    
                }
                io.to(target).emit('message', messageResponse);
            }
            else {
                const roomId = messageObj.room_id.toString();
                io.to(roomId).emit('message',messageResponse);
            }
            
        })
    })
}

interface MessageRequest {
    room_id: number;
    type: "individual" | "group";
    participant: Array<UserResponseDto>;
    send_user_id: number;
    message: string;
}

interface UserResponseDto {
    id: number;
    user_id: string,
    name: string,
    status_msg: string;
    profile_img_url: string,
    background_img_url: string
}
runServer();



