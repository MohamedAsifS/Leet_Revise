
let submitTimeout;
function buttonsubmit(){
 
  document.addEventListener('click', (e) => {
    const button = e.target.closest('[data-e2e-locator="console-submit-button"]');
 
    if (e.target && button){
     
      console.log("Submit clicked");
    if (submitTimeout) clearTimeout(submitTimeout);
     submitTimeout = setTimeout(() => {
    chrome.runtime.sendMessage({ type:"submit", data: "true" }, (response) => {
      if(!response || response.error){
        alert("Session expired or backend reset. Please reload the page and log in again.");}
        else{
          console.log(response);
        }
      
    });
  }, 500); // Only send once every 500ms max
      
      
    }
  },{once:true});
  
}
const observer= new MutationObserver(()=>{
 buttonsubmit()
}

)

observer.observe(document.body,{childList:true,subtree:true})

