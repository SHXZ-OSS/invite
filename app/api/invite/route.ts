import { Octokit } from "@octokit/rest";
import { NextRequest, NextResponse } from "next/server";
import { githubUsernameSchema } from "@/lib/validator";
import { timingSafeEqual } from "crypto";

export async function POST(request: NextRequest) {
 try {
  const body = await request.json();

  const validation = githubUsernameSchema.safeParse(body);

  if (!validation.success) {
   return new NextResponse(
    JSON.stringify({
     error: true,
     message: validation.error.issues[0].message,
    }),
    {
     status: 400,
     headers: {
      "Content-Type": "application/json",
     },
    }
   );
  }

  const { username, password } = validation.data;

  // Check password if PASSWORD environment variable is set
  const requiredPassword = process.env.PASSWORD;
  if (requiredPassword) {
   if (!password) {
    return new NextResponse(
     JSON.stringify({
      error: true,
      message: "Password is required!",
     }),
     {
      status: 401,
      headers: {
       "Content-Type": "application/json",
      },
     }
    );
   }
   
   // Use timing-safe comparison to prevent timing attacks
   try {
    const passwordBuffer = Buffer.from(password);
    const requiredPasswordBuffer = Buffer.from(requiredPassword);
    
    // timingSafeEqual throws if lengths are different, which is constant-time
    if (!timingSafeEqual(passwordBuffer, requiredPasswordBuffer)) {
     return new NextResponse(
      JSON.stringify({
       error: true,
       message: "Invalid password!",
      }),
      {
       status: 401,
       headers: {
        "Content-Type": "application/json",
       },
      }
     );
    }
   } catch {
    // Catch length mismatch errors from timingSafeEqual
    return new NextResponse(
     JSON.stringify({
      error: true,
      message: "Invalid password!",
     }),
     {
      status: 401,
      headers: {
       "Content-Type": "application/json",
      },
     }
    );
   }
  }

  const client = new Octokit({
   auth: process.env.GITHUB_TOKEN,
  });

  if (!client) {
   return new NextResponse(
    JSON.stringify({
     error: true,
     message: "Internal Server Error! Please try again later!",
    }),
    {
     status: 500,
     headers: {
      "Content-Type": "application/json",
     },
    }
   );
  }

  const orgData = await client.orgs.get({
   org: process.env.ORGANIZATION || "",
  });

  if (orgData.status !== 200) {
   return new NextResponse(
    JSON.stringify({
     error: true,
     message: "Internal Server Error! Please try again later!",
    }),
    {
     status: 500,
     headers: {
      "Content-Type": "application/json",
     },
    }
   );
  }

  const user = await client.users.getByUsername({
   username,
  });

  if (user.status !== 200) {
   return new NextResponse(
    JSON.stringify({
     error: true,
     message: "User not found!",
    }),
    {
     status: 400,
     headers: {
      "Content-Type": "application/json",
     },
    }
   );
  }

  const userData = user.data;

  if (!userData.id) {
   return new NextResponse(
    JSON.stringify({
     error: true,
     message: "User not found!",
    }),
    {
     status: 400,
     headers: {
      "Content-Type": "application/json",
     },
    }
   );
  }

  const invite = await client.orgs.createInvitation({
   org: process.env.ORGANIZATION || "",
   invitee_id: userData.id,
   role: "direct_member",
   team_ids: [parseInt(process.env.TEAM_ID || "0")],
  });

  if (invite.status !== 201) {
   return new NextResponse(
    JSON.stringify({
     error: true,
     message: "Internal Server Error! Please try again later!",
    }),
    {
     status: 400,
     headers: {
      "Content-Type": "application/json",
     },
    }
   );
  }

  return new NextResponse(
   JSON.stringify({
    error: false,
    message: "User invited successfully!",
   }),
   {
    status: 200,
    headers: {
     "Content-Type": "application/json",
    },
   }
  );
 } catch (error) {
  const jsonError = JSON.parse(JSON.stringify(error));
  const errorMessage = jsonError.response?.data?.errors?.[0]?.message;

  if (errorMessage?.includes("Invitee is already a part of this organization")) {
   return new NextResponse(
    JSON.stringify({
     error: true,
     message: "User is already a part of the organization!",
    }),
    {
     status: 400,
     headers: {
      "Content-Type": "application/json",
     },
    }
   );
  }

  return new NextResponse(
   JSON.stringify({
    error: true,
    message: "Internal Server Error! Please try again later!",
   }),
   {
    status: 500,
    headers: {
     "Content-Type": "application/json",
    },
   }
  );
 }
}
