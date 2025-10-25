export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
export const SOCKET_SERVER_URL = import.meta.env.VITE_SOCKET_SERVER_URL || "http://127.0.0.1:5000";

export const ROUTES = {
  // users
  REGISTER: `${API_BASE_URL}/api/users/register`,
  LOGIN: `${API_BASE_URL}/api/users/login`,
  
  // profile
  GET_PROFILE: `${API_BASE_URL}/api/users/me/profile`,
  UPDATE_PROFILE: `${API_BASE_URL}/api/users/me/profile`,
  UPLOAD_PROFILE_PICTURE: `${API_BASE_URL}/api/users/me/profile-picture`,
  DELETE_PROFILE_PICTURE: `${API_BASE_URL}/api/users/me/profile-picture`,
  CHANGE_PASSWORD: `${API_BASE_URL}/api/users/me/change-password`,

  // games
  GAMES_LIST: `${API_BASE_URL}/games/`,
  GAME_DETAIL: (id) => `${API_BASE_URL}/games/${id}`,
  SEED_GAMEPIX: `${API_BASE_URL}/games/seed_gamepix`,

  // servers
  SERVERS_LIST: `${API_BASE_URL}/servers/`,
  CREATE_SERVER: `${API_BASE_URL}/servers/`,
  SERVER_CHANNELS: (serverName) =>
    `${API_BASE_URL}/servers/${serverName}/channels`,
  
  // membership
  JOIN_SERVER: (serverName) => `${API_BASE_URL}/servers/${serverName}/join`,
  LEAVE_SERVER: (serverName) => `${API_BASE_URL}/servers/${serverName}/leave`,
  CHECK_MEMBERSHIP: (serverName, username) => 
    `${API_BASE_URL}/servers/${serverName}/is_member/${username}`,

  // messages
  SERVER_MESSAGES: (serverName, channelName) =>
    `${API_BASE_URL}/servers/${serverName}/channels/${channelName}/messages`,

  // voice message upload
  SERVER_VOICE_UPLOAD: (serverName, channelName) =>
    `${API_BASE_URL}/servers/${serverName}/channels/${channelName}/voice`,

  // friends
  GET_ALL_USERS: (username) => `${API_BASE_URL}/api/friends/users?username=${username}`,
  GET_FRIENDS: (username) => `${API_BASE_URL}/api/friends/?username=${username}`,
  GET_PENDING_REQUESTS: (username) => `${API_BASE_URL}/api/friends/requests?username=${username}`,
  SEND_FRIEND_REQUEST: (receiverUsername, senderUsername) => 
    `${API_BASE_URL}/api/friends/request/${receiverUsername}?sender_username=${senderUsername}`,
  ACCEPT_FRIEND_REQUEST: (senderUsername, receiverUsername) => 
    `${API_BASE_URL}/api/friends/accept/${senderUsername}?receiver_username=${receiverUsername}`,
  REJECT_FRIEND_REQUEST: (senderUsername, receiverUsername) => 
    `${API_BASE_URL}/api/friends/reject/${senderUsername}?receiver_username=${receiverUsername}`,

  // direct messages
  SEND_DIRECT_MESSAGE: (sender, receiver) => 
    `${API_BASE_URL}/api/direct-messages/send?sender_username=${sender}&receiver_username=${receiver}`,
  GET_DIRECT_MESSAGES: (user1, user2) => 
    `${API_BASE_URL}/api/direct-messages/?user1=${user1}&user2=${user2}`,
};
