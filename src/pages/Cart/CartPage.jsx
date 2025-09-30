import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./CartPage.css";

function CartPage() {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadCartItems();
  }, []);

  // Load cart items from localStorage
  const loadCartItems = () => {
    try {
      const savedCart = localStorage.getItem("cartItems");
      if (savedCart) {
        const items = JSON.parse(savedCart);
        console.log("Loaded cart items:", items); // Debug log
        setCartItems(items);
      } else {
        setCartItems([]);
      }
    } catch (error) {
      console.error("Lỗi khi tải giỏ hàng:", error);
      setCartItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Update cart items to localStorage
  const updateCartItems = (newItems) => {
    try {
      localStorage.setItem("cartItems", JSON.stringify(newItems));
      setCartItems(newItems);
      // Dispatch event để update cart count
      window.dispatchEvent(new Event("cartUpdated"));
    } catch (error) {
      console.error("Lỗi khi cập nhật giỏ hàng:", error);
    }
  };

  // Handle quantity change
  const handleQuantityChange = (productId, newQuantity) => {
    if (newQuantity < 1) return;

    const updatedItems = cartItems.map((item) =>
      item.id === productId ? { ...item, quantity: newQuantity } : item
    );
    updateCartItems(updatedItems);
  };

  // Remove item from cart
  const handleRemoveItem = (productId) => {
    const updatedItems = cartItems.filter((item) => item.id !== productId);
    updateCartItems(updatedItems);
  };

  // Clear all cart
  const handleClearCart = () => {
    if (
      window.confirm(
        "Bạn có chắc chắn muốn xóa tất cả sản phẩm trong giỏ hàng?"
      )
    ) {
      updateCartItems([]);
    }
  };

  // Calculate total price
  const calculateTotal = () => {
    return cartItems.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
  };

  // Format price
  const formatPrice = (price) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  // Improved image URL handling - consistent with ProductImg component
  const getImageUrl = (item) => {
    // Debug log
    console.log("Processing cart item:", item);
    
    // Try to get image from productImgs array first (like ProductImg component)
    if (item.productImgs && item.productImgs.length > 0) {
      const validImages = item.productImgs.filter(img => !img.isDeleted);
      if (validImages.length > 0) {
        console.log("Using productImgs imageUrl:", validImages[0].imageUrl);
        return validImages[0].imageUrl;
      }
    }
    
    // Fallback to direct imageUrl property
    if (item.imageUrl) {
      console.log("Using direct imageUrl:", item.imageUrl);
      return item.imageUrl;
    }
    
    // Fallback to image property (from AddToCart)
    if (item.image) {
      console.log("Using image property:", item.image);
      return item.image;
    }
    
    console.log("No valid image found, using placeholder");
    return getPlaceholderImage();
  };

  // Generate placeholder image using base64 SVG
  const getPlaceholderImage = () => {
    return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%23f5f5f5' stroke='%23ddd' stroke-width='2'/%3E%3Cg fill='%23999' font-family='Arial, sans-serif' font-size='14' text-anchor='middle'%3E%3Ctext x='100' y='90'%3EKhông có%3C/text%3E%3Ctext x='100' y='110'%3Ehình ảnh%3C/text%3E%3C/g%3E%3C/svg%3E";
  };

  // Handle image loading errors - consistent with ProductImg component
  const handleImageError = (e, itemName) => {
    console.error(`Image load error for ${itemName}:`, e.target.src);
    e.target.src = '/placeholder-image.jpg'; // Use same fallback as ProductImg
    e.target.onerror = null; // Prevent infinite loop
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      alert("Giỏ hàng của bạn đang trống!");
      return;
    }
    navigate("/purchase-order");
  };

  // Continue shopping
  const handleContinueShopping = () => {
    navigate("/products");
  };

  if (loading) {
    return (
      <div className="cart-page">
        <div className="loading">Đang tải giỏ hàng...</div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="cart-header">
        <h1>Giỏ hàng của bạn</h1>
        <div className="cart-actions">
          <button
            className="continue-shopping-btn"
            onClick={handleContinueShopping}
          >
            Tiếp tục mua sắm
          </button>
          {cartItems.length > 0 && (
            <button className="clear-cart-btn" onClick={handleClearCart}>
              Xóa tất cả
            </button>
          )}
        </div>
      </div>

      {cartItems.length === 0 ? (
        <div className="empty-cart">
          <div className="empty-cart-icon">🛒</div>
          <h2>Giỏ hàng của bạn đang trống</h2>
          <p>
            Hãy khám phá những sản phẩm gốm sứ thủ công tuyệt đẹp của chúng tôi
          </p>
          <button className="shop-now-btn" onClick={handleContinueShopping}>
            Mua sắm ngay
          </button>
        </div>
      ) : (
        <div className="cart-content">
          <div className="cart-items">
            {cartItems.map((item) => (
              <div key={item.id} className="cart-item">
                <div className="item-image">
                  <img
                    src={getImageUrl(item)}
                    alt={item.name || 'Sản phẩm'}
                    onError={(e) => handleImageError(e, item.name)}
                    onLoad={() => console.log(`Image loaded successfully for ${item.name}`)}
                    style={{
                      maxWidth: '100%',
                      height: 'auto',
                      objectFit: 'cover'
                    }}
                  />
                </div>

                <div className="item-details">
                  <h3 className="item-name">{item.name}</h3>
                  <p className="item-price">{formatPrice(item.price)}</p>
                  {item.isCustom && item.customText && (
                    <div className="item-custom">Yêu cầu: {item.customText}</div>
                  )}
                </div>

                <div className="item-quantity">
                  <label>Số lượng:</label>
                  <div className="quantity-controls">
                    <button
                      onClick={() =>
                        handleQuantityChange(item.id, item.quantity - 1)
                      }
                      disabled={item.quantity <= 1}
                      className="quantity-btn"
                    >
                      -
                    </button>
                    <span className="quantity-display">{item.quantity}</span>
                    <button
                      onClick={() =>
                        handleQuantityChange(item.id, item.quantity + 1)
                      }
                      className="quantity-btn"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="item-total">
                  <span className="total-label">Tổng:</span>
                  <span className="total-price">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </div>

                <div className="item-actions">
                  <button
                    onClick={() => handleRemoveItem(item.id)}
                    className="remove-btn"
                    title="Xóa sản phẩm"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="cart-summary">
            <div className="summary-card">
              <h3>Tóm tắt đơn hàng</h3>

              <div className="summary-row">
                <span>Số lượng sản phẩm:</span>
                <span>
                  {cartItems.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              </div>

              <div className="summary-row">
                <span>Tạm tính:</span>
                <span>{formatPrice(calculateTotal())}</span>
              </div>

              {/* <div className="summary-row">
                <span>Phí vận chuyển:</span>
                <span>Miễn phí</span>
              </div> */}

              <div className="summary-divider"></div>

              <div className="summary-row total">
                <span>Tổng cộng:</span>
                <span>{formatPrice(calculateTotal())}</span>
              </div>

              <button className="checkout-btn" onClick={handleCheckout}>
                Tiến hành thanh toán
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CartPage;