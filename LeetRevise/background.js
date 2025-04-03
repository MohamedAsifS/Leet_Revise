







// background.js
let lastestData = false;


function decodeJwt(token) {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split('')
      .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  );
  return JSON.parse(jsonPayload);
}


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log(request.type)
  if (request.type === "submit" ) {
        lastestData=true
       
    
    console.log("Data stored in background: ", request.type);
  }
  if ( request.type === "GET_LATEST_DATA") {
    console.log("Lastest data stored in background for user: ", lastestData)
    async function control() {
      const leetCookie = await getcookies().catch((err) => console.log(err));
      const csrf = await getCsrf().catch((err) => console.log(err));
      console.log("Cookies and CSRF fetched:", leetCookie, csrf,lastestData);
     
      try{
      let data = await sendData(leetCookie,csrf,lastestData,"profile") 
      console.log(data)
      sendResponse(data);}
      catch(err){
        console.log(err)
      }
    
     
    }
    control();
 
  }
  if(request.type === "submit"){
    async function control() {
      console.log("User is Submiited")
      const leetCookie = await getcookies().catch((err) => console.log(err));
      const csrf = await getCsrf().catch((err) => console.log(err));
      console.log("Cookies and CSRF fetched:", leetCookie, csrf,lastestData);
      let value = await get_path()
      console.log(value,"path")
      let check=tokenValidator().then((e)=>console.log(e)).catch((err)=>console.log(err))
      try{
       if (check){
        console.log("its sign in")
        const {access,refresh}= await getToken()
        let data = await sendData(leetCookie,csrf,lastestData,"datas",value,access) 
        console.log(data)}

  }catch(err){
    console.log(err)
  }}
  control()
}


  if (request.type === "Need_Token") {
    async function control() {
      await initialTrigger().catch((err)=>console.log(err))
   
      const result = await tokenValidator().catch((err)=>console.log(err))
      console.log(result)
  
      
    
        sendResponse({data:result});

      
      
      console.log("data is sent");
    }
    control();
  }

  

  if (request.type === "ToCheck") {
    async function control() {
      const result = await tokenValidator().catch((err)=>console.log(err));
      if (result){
      
        chrome.storage.local.get(['access'],(token)=>{
         if(token){
          console.log(token.access)
          let values={
            access:token.access,
            status:true
          }
          console.log(values,values.status)
          sendResponse(values);
         }
         else{
          console.log("token is invalid")
         }

             
        })
        
         
        }
      
      console.log("Token check sent");
    }
    control();
  }




  

  return true; //  lets chrome know the response will be async
});



async function initialTrigger() {
  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      {
        url:"https://leetcoderevisebackend-production.up.railway.app/accounts/github/login/",
        interactive: true
      },
      (url) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }

        try {
          const change = new URL(url);
          const accessValue = change.searchParams.get("access");
          const refreshValue = change.searchParams.get("refresh");
          console.log('I"m on initial get the token call back')
          console.log(accessValue, refreshValue);

          chrome.storage.local
            .set({ access: accessValue, refresh: refreshValue })
            .then(() => {
              console.log("Values stored in storage");
              resolve({ access: accessValue, refresh: refreshValue });
            })
            .catch((err) => {
              reject(err);
            });
        } catch (err) {
          console.log("Failed to callback")
          reject(err);
        }
      }
    );
  });
}

async function getToken(){
  return new Promise((resolve) => {
  
    chrome.storage.local.get(['access','refresh'],(result)=>{
       resolve({
         access: result.access,
         refresh: result.refresh
       })
    })
})
}
async function refreshToken(refresh) {

  return new Promise((resolve, reject) => {
    console.log(refresh)
  fetch("https://leetcoderevisebackend-production.up.railway.app/verify/",{
    method: 'POST',
    headers: {
    'Content-Type': 'application/json',
  },
  
    body:  JSON.stringify({ refresh:refresh })
  }).then(response => response.json()).then(result=>{
    console.log(result)
    chrome.storage.local
      .set({ access: result.access, refresh: result.refresh })
      .then(() => {
        console.log("refreshed and  stored in storage");
        resolve(true);

      }).catch((err)=>console.log(err))}
  ).catch(err=>
    {console.log("error In refreshing the token",err)
      reject(false);})
  



})}




async function tokenValidator() {
  const {access,refresh}= await getToken()
  console.log(access,refresh,"token is in token validator")
  if(access && refresh){
    const decode = decodeJwt(access)
    const exp=decode.exp 
    const now=Date.now()/1000 
    const  date = new Date()
    console.log(exp ,now,"Expiration",date)
    if (exp < now){
      console.log("token expired waiting to get refesh or not",exp,now)
      return await refreshToken(refresh)
    }else{
      console.log("token is valid without refreshed")
      return true
    }
  }
  else{
    console.log("access or refresh token not found")
    return false
  }

}


  

async function getcookies() {
  return new Promise((resolve, reject) => {
    chrome.cookies.get({ url: "https://leetcode.com", name: "LEETCODE_SESSION" }, (cookie) => {
      if (cookie) {
        console.log("Got LEETCODE_SESSION cookie:", cookie.value);
        resolve(cookie.value);
      } else {
        console.log("LEETCODE_SESSION cookie not found");
        reject(null);
      }
    });
  });
}

async function getCsrf() {
  return new Promise((resolve, reject) => {
    chrome.cookies.get({ url: "https://leetcode.com", name: "csrftoken" }, (cookie) => {
      if (cookie) {
        console.log("Got CSRF token:", cookie.value);
        resolve(cookie.value);
      } else {
        console.log("CSRF token not found");
        reject(null);
      }
    });
  });
}

function sendData(cookie,csrf,status,path,repo_path=null,access=null){
  return new Promise(function(resolve){

  fetch(`https://leetcoderevisebackend-production.up.railway.app/${path}`,{
    method:"POST",
    headers:{
     'Content-Type': 'application/json',
    'Authorization': `Bearer ${access}` 
    },
    body:JSON.stringify({status_code:status,cookies:cookie,csrf_token:csrf,repo_path:repo_path})
}).then((response)=>{
 return  response.json()

}).then((data)=>{
  console.log(data)
  resolve(data)
}).catch((err)=>{
  console.log(err)
})
  })
}


async function get_path(){
  return new Promise((resolve)=>{
   chrome.storage.local.get(['repo'],(value)=>{
    console.log(value)
    resolve(value.repo)

   })
   
 
})}