// ✅ Firebase Import
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-storage.js"; // Add Storage import

// ✅ Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDHGg8BYIVH_hr1DlKuBkyCpJnob6EuXAE",
  authDomain: "printwala-f7ca7.firebaseapp.com",
  projectId: "printwala-f7ca7",
  storageBucket: "printwala-f7ca7.firebasestorage.app",
  messagingSenderId: "452064945256",
  appId: "1:452064945256:web:02893728c063ee71dd87dd",
  measurementId: "G-SKN0SG805T"
};




// ✅ Firebase Configuration and Initialize
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app); // Initialize Storage

// ✅ Start Loader (Common for Login & Checkout Data)

function startLoader() {

if (!document.getElementById("loadingSpinner")) {

const loader = document.createElement("div");

loader.id = "loadingSpinner";

loader.style.position = "fixed";

loader.style.top = "0";

loader.style.left = "0";

loader.style.width = "100vw";

loader.style.height = "100vh";

loader.style.background = "rgba(0, 0, 0, 0.7)";

loader.style.display = "flex";

loader.style.alignItems = "center";

loader.style.justifyContent = "center";

loader.style.zIndex = "9999";



loader.innerHTML = `

  <div style="width: 60px; height: 60px; border: 5px solid white; border-top-color: #FF0000; border-radius: 50%; animation: spin 1s linear infinite;"></div>

  <style>@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }</style>

`;



document.body.appendChild(loader);

}

}

// ✅ Stop Loader

function stopLoader() {

const loader = document.getElementById("loadingSpinner");

if (loader) {

loader.remove();

}

}

// ✅ Check Authentication + Load Checkout Data with Loader

startLoader(); // ✅ Loader Start before everything

onAuthStateChanged(auth, (user) => {

if (!user) {

alert("⚠ Please login to continue checkout.");

sessionStorage.setItem("redirectAfterLogin", window.location.href);

window.location.href = "login.html";

} else {

document.getElementById("userEmail").textContent = user.email;

document.getElementById("userEmail").style.display = "inline-block";

loadCheckoutData();

}

});

// ✅ Load Order Details from sessionStorage

function loadCheckoutData() {

setTimeout(() => { // ✅ Smooth Transition ke liye Delay

const orderDetails = JSON.parse(sessionStorage.getItem("orderDetails"));



if (!orderDetails) {

  alert("⚠ No order details found! Redirecting to home.");

  window.location.href = "index.html";

  return;

}



document.getElementById("orderName").textContent = orderDetails.name;

document.getElementById("orderPrice").textContent = orderDetails.price;

document.getElementById("orderType").textContent = `Product Type: ${orderDetails.type}`;



document.getElementById("orderImage1").src = orderDetails.image1 || "https://via.placeholder.com/200";

document.getElementById("orderImage2").src = orderDetails.image2 || "https://via.placeholder.com/200";



if (orderDetails.image2) {

  document.getElementById("orderImage2").style.display = "block";

}



document.getElementById("fullName").textContent = orderDetails.fullName;

document.getElementById("address").textContent = orderDetails.address;

document.getElementById("city").textContent = orderDetails.city;

document.getElementById("state").textContent = orderDetails.state;

document.getElementById("pincode").textContent = orderDetails.pincode;

document.getElementById("mobile").textContent = orderDetails.mobile;



stopLoader(); // ✅ Loader Stop jab sab kuch load ho jaye

}, 1000);

}

// ✅ Payment Integration with Razorpay
document.getElementById("placeOrderBtn").addEventListener("click", async function() {
  try {
    const orderDetails = JSON.parse(sessionStorage.getItem("orderDetails"));
    const user = auth.currentUser;
    
    if (!user) {
      alert("Please login first!");
      return window.location.href = "login.html";
    }
    
    // Basic Validation
    if (!orderDetails?.price || !orderDetails?.name) {
      throw new Error("Invalid order details");
    }
    
    showLoader();
    
    // Convert Price to Paise
    const amount = parseInt(orderDetails.price.replace(/[^0-9]/g, "")) * 100;
    
    const options = {
      key: "rzp_test_HKbyNumdqKSmag",
      amount: amount,
      currency: "INR",
      name: "Print Wala",
      description: orderDetails.name,
      image: "https://codesparshofficial.github.io/Print420/img12.png",
      prefill: {
        name: orderDetails.fullName,
        email: user.email,
        contact: orderDetails.mobile
      },
      theme: { color: "#FFB3B3" },
      handler: async function(response) {
        try {
          if (!response.razorpay_payment_id) {
            throw new Error("Payment failed");
          }
          
          // Upload Images to Firebase Storage
          const uploadImage = async (imgData, imgName) => {
            if (!imgData.startsWith("data:image/")) return imgData;
            
            const blob = await fetch(imgData).then(r => r.blob());
            const storageRef = ref(storage, `orders/${user.uid}/${Date.now()}_${imgName}`);
            await uploadBytes(storageRef, blob);
            return await getDownloadURL(storageRef);
          };
          
          // Upload both images
          const [image1Url, image2Url] = await Promise.all([
            uploadImage(orderDetails.image1, "design1"),
            uploadImage(orderDetails.image2 || "", "design2")
          ]);
          
          // Save order with image URLs
          // Save order with paymentStatus
await saveOrderToFirebase({
  ...orderDetails,
  image1: image1Url,
  image2: image2Url || "No second image",
  email: user.email,
  uid: user.uid,
  paymentId: response.razorpay_payment_id,
  paymentStatus: "Paid",  // ✅ Payment Status Added
  timestamp: new Date().toISOString()
});

// ✅ Save Order Details in sessionStorage for order-success.html
sessionStorage.setItem("paymentDetails", JSON.stringify({
  orderDetails: {
    name: orderDetails.name,
    price: orderDetails.price
  },
  paymentId: response.razorpay_payment_id,
  paymentStatus: "Paid"
}));

// ✅ Redirect to Order Success Page
window.location.href = "order-success.html";
          
          window.location.href = "order-success.html";
        } catch (error) {
          alert(`Payment Failed: ${error.message}`);
        } finally {
          hideLoader();
        }
      },
      modal: {
        ondismiss: () => {
          alert("Payment cancelled. You can retry payment.");
          hideLoader();
        }
      }
    };
    
    const rzp = new Razorpay(options);
    rzp.open();
    
  } catch (error) {
    alert(`Error: ${error.message}`);
    hideLoader();
  }
});

// ✅ Show Loader Function (100% Working)

function showLoader() {

if (!document.getElementById("loadingSpinner")) {

const loader = document.createElement("div");

loader.id = "loadingSpinner";

loader.style.position = "fixed";

loader.style.top = "0";

loader.style.left = "0";

loader.style.width = "100vw";

loader.style.height = "100vh";

loader.style.background = "rgba(0, 0, 0, 0.7)";

loader.style.display = "flex";

loader.style.alignItems = "center";

loader.style.justifyContent = "center";

loader.style.zIndex = "9999";



loader.innerHTML = `

  <div style="width: 60px; height: 60px; border: 5px solid white; border-top-color: #FF0000; border-radius: 50%; animation: spin 1s linear infinite;"></div>

  <style>@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }</style>

`;



document.body.appendChild(loader);

console.log("✅ Loader Added");

}

}

// ✅ Hide Loader Function

function hideLoader() {

const loader = document.getElementById("loadingSpinner");

if (loader) {

loader.remove();

console.log("✅ Loader Removed");

}

}

 // ✅ Save Order to Firebase Firestore
async function saveOrderToFirebase(order) {

  try {

    const user = auth.currentUser;

    if (!user) throw new Error("User not authenticated");



    // ✅ Get Current Date & Time (Formatted)

    const now = new Date();

    const formattedDateTime = now.toLocaleString("en-IN", { 

      day: "2-digit", month: "2-digit", year: "numeric", 

      hour: "2-digit", minute: "2-digit", second: "2-digit",

      hour12: true 

    });



    const orderWithUID = {

      ...order,

      uid: user.uid,

      createdAt: formattedDateTime // Save formatted date-time

    };



    await addDoc(collection(db, "orders"), orderWithUID);

  } catch (error) {

    throw new Error("Firestore save failed: " + error.message);

  }

}

  



// ✅ Retrieve Payment Details

function getPaymentDetails() {

const paymentData = JSON.parse(sessionStorage.getItem("paymentDetails"));

if (paymentData) {

console.log("✅ Payment Data Retrieved:", paymentData);

return paymentData;

} else {

console.log("❌ No Payment Data Found.");

return null;

}

}

                   
