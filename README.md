# YouTube Request Journey

This diagram shows what happens when we open YouTube and press Enter.

First, the **Browser (Client)** checks its cache. Then, **DNS** finds the IP address of the YouTube server.

After that, the request goes through the **Router**, **ISP**, and different **Internet Routers** until it reaches the **CDN / Edge**.

Then, the **Load Balancer** sends the request to the right **Web Server / API**. The **Application / Backend** processes the request and communicates with the **Database** if it needs data.

After the request is processed, the response goes back through the same layers until it reaches the **Browser**, where the user can see the result.

In simple words:

**Browser → DNS → Internet → CDN → Load Balancer → Backend → Database → Response → Browser**

This diagram helps us understand the basic journey of a request in a real web system.
