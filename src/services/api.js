import axios from "axios";

const API = axios.create({
  baseURL: "https://smart-irrigation-backend-wra6.onrender.com/api",
});

export default API;