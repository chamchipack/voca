import axios from "axios";
import PocketBase from "pocketbase";

const axiosInstance = axios.create({
  baseURL: "http://127.0.0.1:8050",
  timeout: 5000,
});

const getData = async (url) => {
  try {
    // const response = await axiosInstance.get('/api/collections/members/records');
    const response = await axiosInstance.get(url, {
      headers: {
        "zoe-token": process.env.NEXT_PUBLIC_API_KEY,
        "Content-Type": "application/json",
      },
    });

    return response.data;
  } catch (error) {
    console.error(error);
  }
};

const getPocket = async (url) => {
  try {
    // const response = await axiosInstance.get('/api/collections/members/records');
    const response = await axiosInstance.get(url);

    return response.data;
  } catch (error) {
    console.error(error);
  }
};

const postData = async (url, data) => {
  try {
    const response = await axiosInstance.post(url, data, {
      headers: {
        "zoe-token": process.env.NEXT_PUBLIC_API_KEY,
        "Content-Type": "application/json",
      },
    });
    return response.data;
  } catch (error) {
    console.error(error);
  }
};

const putPocket = async (url, data) => {
  const { id = "", ...rest } = data;
  try {
    const response = await axiosInstance.patch(url + "/" + id, rest, {
      headers: {
        "zoe-token": process.env.NEXT_PUBLIC_API_KEY,
        "Content-Type": "application/json",
      },
    });
    return response.data;
  } catch (error) {
    console.error(error);
  }
};

const deletePocket = async (url) => {
  try {
    const response = await axiosInstance.delete(url, {
      headers: {
        "zoe-token": process.env.NEXT_PUBLIC_API_KEY,
        "Content-Type": "application/json",
      },
    });
    return response.data;
  } catch (error) {
    console.error(error);
  }
};

const result = {
  get: getData,
  post: postData,
  put: putPocket,
  delete: deletePocket,
  getPocket,
};

export default result;
