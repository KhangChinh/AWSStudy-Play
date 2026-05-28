//đưa lên lambda
/**
 * DynamoDB Service — Singleton client cho Main Process
 * 
 * Chỉ tạo kết nối 1 LẦN DUY NHẤT khi app khởi động.
 * Tất cả các lần gọi sau đều tái sử dụng client này.
 * 
 * Credentials được đọc từ biến môi trường (KHÔNG hardcode).
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { TABLES } from "./dbConfig.js";

// ═══════════════════════════════════════════
//  SINGLETON CLIENT — Chỉ khởi tạo 1 lần
// ═══════════════════════════════════════════
let docClient = null;

function getDocClient() {
  if (!docClient) {
    const client = new DynamoDBClient({
      region: process.env.AWS_REGION || "ap-southeast-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
    docClient = DynamoDBDocumentClient.from(client);
    console.log("✅ DynamoDB client đã được khởi tạo (singleton)");
  }
  return docClient;
}



// ═══════════════════════════════════════════
//  HÀM GHI — Lưu thông tin user vào DynamoDB
//  Cấu trúc bảng: PK = UserID, UserInformation = { email, name }
// ═══════════════════════════════════════════
export async function saveUser(userId, email, name) {
  const client = getDocClient();

  const params = {
    TableName: TABLES.USER,
    Item: {
      UserID: userId,                // Partition Key
      UserInformation: {
        email: email,
        name: name || "N/A",
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };

  try {
    await client.send(new PutCommand(params));
    console.log("✅ Ghi user vào DynamoDB thành công:", userId);
    return { success: true };
  } catch (error) {
    console.error("❌ Lỗi khi ghi vào DynamoDB:", error.message);
    return { success: false, error: error.message };
  }
}

// ═══════════════════════════════════════════
//  HÀM ĐỌC — Lấy thông tin user từ DynamoDB
// ═══════════════════════════════════════════
export async function getUser(userId) {
  const client = getDocClient();

  const params = {
    TableName: TABLES.USER,
    Key: { UserID: userId },
  };

  try {
    const response = await client.send(new GetCommand(params));

    if (response.Item) {
      const info = response.Item.UserInformation || {};
      console.log("--- 🕵️ THÔNG TIN USER TỪ DYNAMODB ---");
      console.log("UserID:", response.Item.UserID);
      console.log("Email:", info.email);
      console.log("Họ Tên:", info.name);
      console.log("Ngày tạo:", response.Item.createdAt);
      console.log("--------------------------------------");
      // Trả về data đã flatten để renderer dùng dễ hơn
      return {
        success: true,
        data: {
          userId: response.Item.UserID,
          email: info.email,
          name: info.name,
          createdAt: response.Item.createdAt,
        },
      };
    } else {
      console.log(`⚠️ Không tìm thấy user: ${userId}`);
      return { success: true, data: null };
    }
  } catch (error) {
    console.error("❌ Lỗi khi đọc từ DynamoDB:", error.message);
    return { success: false, error: error.message };
  }
}
