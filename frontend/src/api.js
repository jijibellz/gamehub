import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000", // replace with your FastAPI backend URL
  withCredentials: true, // if you're using cookies for auth
});

export default api;
