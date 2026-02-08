
import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { supabase } from "./lib/supabaseClient";

function PaymentCard() {
  const location = useLocation();
  const initialAmount = location.state?.amount || "0.00";
  const initialPackageName = location.state?.packageName || "basic";
  const [amount, setAmount] = useState(initialAmount);
  const [paid, setPaid] = useState(false);
  const [validPackages, setValidPackages] = useState([]);
  const [packageFetchError, setPackageFetchError] = useState(null);

  useEffect(() => {
    // Fetch valid package names
    const fetchPackages = async () => {
      try {
        const response = await fetch("http://localhost:3000/api/packages", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        const result = await response.json();
        if (response.ok) {
          setValidPackages(result.map((pkg) => pkg.name.toLowerCase()));
          setPackageFetchError(null);
        } else {
          console.error("Failed to fetch packages:", result.error);
          setPackageFetchError(result.error || "Failed to fetch packages");
        }
      } catch (err) {
        console.error("Error fetching packages:", err);
        setPackageFetchError("Failed to connect to server");
      }
    };
    fetchPackages();
  }, []);

  const validateAmount = (value) => {
    const num = parseFloat(value);
    return num > 0 && !isNaN(num);
  };

  return (
    <div
      style={{
        padding: "40px",
        maxWidth: "400px",
        margin: "80px auto",
        borderRadius: "12px",
        background: "#fff",
        boxShadow: "0 8px 20px rgba(0,0,0,0.1)",
        fontFamily: "Inter, sans-serif",
        textAlign: "center",
      }}
    >
      <h2>Make a Payment</h2>
      <label htmlFor="amountInput">Amount (USD):</label>
      <input
        id="amountInput"
        type="number"
        min="1"
        step="0.01"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        style={{
          fontSize: "18px",
          padding: "8px",
          margin: "10px 0",
          width: "100%",
        }}
      />
      {!paid ? (
        <PayPalScriptProvider
          options={{
            "client-id":
              "Aav0poIpivqe0oH8RZkwdfHzxNKzGID6j58AZnR3VsImFvbHo9hUVp42jblmT1L1g3Uah-udg3NkAo7o",
          }}
        >
          <PayPalButtons
            style={{ layout: "vertical" }}
            createOrder={async (data, actions) => {
              if (!validateAmount(amount)) {
                alert("Please enter a valid amount greater than 0.");
                return Promise.reject("Invalid amount");
              }
              const packageNameLower = initialPackageName.toLowerCase();
              if (
                validPackages.length > 0 &&
                !validPackages.includes(packageNameLower)
              ) {
                alert(
                  `Invalid package name: ${initialPackageName}. Please select a valid package.`
                );
                return Promise.reject("Invalid package name");
              }
              if (packageFetchError && packageNameLower !== "basic") {
                alert(
                  `Cannot validate package '${initialPackageName}' due to server error: ${packageFetchError}. Only 'basic' package is allowed as fallback.`
                );
                return Promise.reject("Package validation failed");
              }
              try {
                const response = await fetch(
                  "http://localhost:3000/api/create-order",
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      amount: parseFloat(amount).toFixed(2),
                      package_name: packageNameLower,
                    }),
                  }
                );
                const result = await response.json();
                if (!response.ok) {
                  alert(result.error || "Failed to create order");
                  return Promise.reject(result.error);
                }
                return result.orderID;
              } catch (err) {
                console.error("Create order error:", err);
                alert("Failed to create order. Please try again.");
                return Promise.reject(err);
              }
            }}
            onApprove={async (data, actions) => {
              try {
                const details = await actions.order.capture();
                alert(
                  `Thanks, ${details.payer.name.given_name}! Payment of $${amount} successful.`
                );
                setPaid(true);

                // Check if user is authenticated
                const {
                  data: { user },
                  error: userError,
                } = await supabase.auth.getUser();

                if (userError || !user) {
                  console.error("Supabase auth error:", userError);
                  alert("User not signed in. Please log in again.");
                  window.location.href = "/login";
                  return;
                }

                const packageName = initialPackageName.toLowerCase();

                // Refresh the session to get a valid access token
                const {
                  data: refreshedSession,
                  error: refreshError,
                } = await supabase.auth.refreshSession();

                if (refreshError || !refreshedSession.session) {
                  console.error("Session refresh error:", refreshError?.message || "No session");
                  alert("Session expired. Please log in again.");
                  window.location.href = "/login";
                  return;
                }

                console.log("Refreshed session:", refreshedSession);

                const userToken = refreshedSession.session.access_token;

                const response = await fetch(
                  `http://localhost:3000/api/capture-order/${details.id}`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${userToken}`,
                    },
                    body: JSON.stringify({
                      user_id: user.id,
                      package_name: packageName,
                    }),
                  }
                );

                const result = await response.json();
                if (response.ok && result.message) {
                  alert(result.message);
                } else {
                  console.error("Backend error:", result);
                  alert(
                    "Error assigning package: " +
                      (result.error || "Unknown error")
                  );
                }
              } catch (err) {
                console.error("PayPal approve error:", err);
                alert("Payment processing failed.");
              }
            }}
            onError={(err) => {
              console.error("PayPal button error:", err);
              alert("Payment failed. Please try again.");
            }}
          />
        </PayPalScriptProvider>
      ) : (
        <div
          style={{
            marginTop: "20px",
            color: "green",
            fontWeight: "bold",
          }}
        >
          Payment Completed
        </div>
      )}
    </div>
  );
}

export default PaymentCard;
