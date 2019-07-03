import { Component } from '@angular/core';
import Chatkit from '@pusher/chatkit-client';
import axios from 'axios';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent {
  userId = '';
  currentUser = {} as any;
  messages = [];
  currentRoom = {} as any;
  roomUsers = [];
  userRooms = [];
  newMessage = '';
  newRoom = {
    name: '',
    isPrivate: false
  };
  joinableRooms = [];
  newUser: '';

  addUserToRoom() {
    const { newUser, currentUser, currentRoom } = this;
    currentUser.addUserToRoom({
      userId: newUser,
      roomId: currentRoom.id
    }).then((currentRoom) => {
      this.roomUsers = currentRoom.users;
    }).catch((err: any) => {
      console.log(`Erreur lors de l'ajout de l'utilisateur: ${err}`);
    });
    this.newUser = '';
  }

  createRoom() {
    const { newRoom: { name, isPrivate }, currentUser } = this;
    if (name.trim() === '') {
      return;
    }
    currentUser.createRoom({
      name,
      private: isPrivate,
    }).then((room: { id: any; }) => {
      this.connectToRoom(room.id);
      this.newRoom = {
        name: '',
        isPrivate: false,
      };
    }).catch((err: any) => {
      console.log(`Erreur de création de salon ${err}`);
    });
  }

  getJoinableRooms() {
    const { currentUser } = this;
    currentUser.getJoinableRooms().then((rooms: any[]) => {
      this.joinableRooms = rooms;
    }).catch((err: any) => {
      console.log(`Erreur d'obtention du salon: ${err}`);
    });
  }

  joinRoom(id: any) {
    const { currentUser } = this;
    currentUser.joinRoom({ roomId: id }).catch((err: any) => {
      console.log(`Erreur d'accès au salon ${id}: ${err}`);
    });
  }

  connectToRoom(id: any) {
    this.messages = [];
    const { currentUser } = this;

    currentUser.subscribeToRoom({
      roomId: `${id}`,
      messageLimit: 100,
      hooks: {
        onMessage: (message: any) => {
          this.messages.push(message);
        },
        onPresenceChanged: () => {
          this.roomUsers = this.currentRoom.users.sort((a: { presence: { state: string; }; }) => {
            if (a.presence.state === 'online') {
              return -1;
            }

            return 1;
          });
        },
      },
    })
      .then((currentRoom: { users: any[]; }) => {
        this.currentRoom = currentRoom;
        this.roomUsers = currentRoom.users;
        this.userRooms = currentUser.rooms;
      });
  }

  sendMessage() {
    const { newMessage, currentUser, currentRoom } = this;
    if (newMessage.trim() === '') {
      return;
    }
    currentUser.sendMessage({
      text: newMessage,
      roomId: `${currentRoom.id}`,
    });
    this.newMessage = '';
  }

  addUser() {
    const { userId } = this;
    axios.post('http://localhost:5200/users', { userId })
      .then(() => {
        const tokenProvider = new Chatkit.TokenProvider({
          url: 'http://localhost:5200/authenticate'
        });

        const chatManager = new Chatkit.ChatManager({
          instanceLocator: 'v1:us1:5e1652bf-6b99-44cf-9f14-75989d72e87b',
          userId,
          tokenProvider
        });

        return chatManager
          .connect({
            onAddedToRoom: (room: any) => {
              this.userRooms.push(room);
              this.getJoinableRooms();
            },
          })
          .then((currentUser: any) => {
            this.currentUser = currentUser;
            this.connectToRoom('19910613');
            this.getJoinableRooms();
          });
      })
      .catch(error => console.error(error));
  }
}
