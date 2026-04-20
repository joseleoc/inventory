import { create } from "zustand";

import { type ProductLookupItem } from "@/services/sales";

export type CartLine = {
  productId: string;
  sku: string;
  barcode?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  currentStockSnapshot: number;
  stockThreshold: number;
};

export type SalesCart = {
  id: string;
  clientLabel: string;
  status: "active" | "completed";
  lines: CartLine[];
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  saleId?: string;
};

type CartActionResult = {
  ok: boolean;
  message?: string;
};

type SalesCartState = {
  carts: SalesCart[];
  archivedCarts: SalesCart[];
  activeCartId: string;
  createCart: (clientLabel?: string) => string;
  switchActiveCart: (cartId: string) => void;
  renameActiveCart: (clientLabel: string) => void;
  addProductToActiveCart: (product: ProductLookupItem, quantity?: number) => CartActionResult;
  removeLineItem: (productId: string) => void;
  incrementLineItem: (productId: string) => CartActionResult;
  decrementLineItem: (productId: string) => CartActionResult;
  setLineItemQuantity: (productId: string, quantity: number) => CartActionResult;
  clearActiveCart: () => void;
  archiveActiveCart: (meta?: { saleId?: string }) => void;
};

function makeId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function createEmptyCart(clientLabel: string): SalesCart {
  const now = Date.now();

  return {
    id: makeId("cart"),
    clientLabel,
    status: "active",
    lines: [],
    createdAt: now,
    updatedAt: now,
  };
}

const DEFAULT_CART = createEmptyCart("Client 1");

function updateLineQuantity(line: CartLine, quantity: number): CartActionResult {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return { ok: false, message: "Quantity must be an integer greater than 0." };
  }

  if (quantity > line.currentStockSnapshot) {
    return {
      ok: false,
      message: `Only ${line.currentStockSnapshot} units available for ${line.name}.`,
    };
  }

  return { ok: true };
}

export const useSalesCartStore = create<SalesCartState>((set, get) => ({
  carts: [DEFAULT_CART],
  archivedCarts: [],
  activeCartId: DEFAULT_CART.id,
  createCart: (clientLabel) => {
    const state = get();
    const nextLabel =
      clientLabel?.trim() || `Client ${state.carts.length + state.archivedCarts.length + 1}`;
    const cart = createEmptyCart(nextLabel);

    set((current) => ({
      carts: [...current.carts, cart],
      activeCartId: cart.id,
    }));

    return cart.id;
  },
  switchActiveCart: (cartId) => {
    set((current) => {
      if (!current.carts.some((cart) => cart.id === cartId)) {
        return current;
      }

      return { activeCartId: cartId };
    });
  },
  renameActiveCart: (clientLabel) => {
    const nextLabel = clientLabel.trim();
    if (!nextLabel) {
      return;
    }

    set((current) => ({
      carts: current.carts.map((cart) =>
        cart.id === current.activeCartId
          ? {
              ...cart,
              clientLabel: nextLabel,
              updatedAt: Date.now(),
            }
          : cart,
      ),
    }));
  },
  addProductToActiveCart: (product, quantity = 1) => {
    const state = get();
    const activeCart = state.carts.find((cart) => cart.id === state.activeCartId);

    if (!activeCart) {
      return { ok: false, message: "No active cart selected." };
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return { ok: false, message: "Quantity must be an integer greater than 0." };
    }

    const existingLine = activeCart.lines.find((line) => line.productId === product.id);
    const nextQuantity = (existingLine?.quantity ?? 0) + quantity;

    if (nextQuantity > product.currentStock) {
      return {
        ok: false,
        message: `Only ${product.currentStock} units available for ${product.name}.`,
      };
    }

    set((current) => ({
      carts: current.carts.map((cart) => {
        if (cart.id !== current.activeCartId) {
          return cart;
        }

        const lineIndex = cart.lines.findIndex((line) => line.productId === product.id);

        if (lineIndex === -1) {
          return {
            ...cart,
            updatedAt: Date.now(),
            lines: [
              ...cart.lines,
              {
                productId: product.id,
                sku: product.sku,
                barcode: product.barcode,
                name: product.name,
                quantity,
                unitPrice: product.unitPrice,
                currentStockSnapshot: product.currentStock,
                stockThreshold: product.stockThreshold,
              },
            ],
          };
        }

        const lines = [...cart.lines];
        lines[lineIndex] = {
          ...lines[lineIndex],
          quantity: nextQuantity,
          currentStockSnapshot: product.currentStock,
          stockThreshold: product.stockThreshold,
        };

        return {
          ...cart,
          updatedAt: Date.now(),
          lines,
        };
      }),
    }));

    return { ok: true };
  },
  removeLineItem: (productId) => {
    set((current) => ({
      carts: current.carts.map((cart) =>
        cart.id === current.activeCartId
          ? {
              ...cart,
              updatedAt: Date.now(),
              lines: cart.lines.filter((line) => line.productId !== productId),
            }
          : cart,
      ),
    }));
  },
  incrementLineItem: (productId) => {
    const state = get();
    const activeCart = state.carts.find((cart) => cart.id === state.activeCartId);
    const line = activeCart?.lines.find((item) => item.productId === productId);

    if (!line) {
      return { ok: false, message: "Line item not found." };
    }

    return state.setLineItemQuantity(productId, line.quantity + 1);
  },
  decrementLineItem: (productId) => {
    const state = get();
    const activeCart = state.carts.find((cart) => cart.id === state.activeCartId);
    const line = activeCart?.lines.find((item) => item.productId === productId);

    if (!line) {
      return { ok: false, message: "Line item not found." };
    }

    if (line.quantity <= 1) {
      state.removeLineItem(productId);
      return { ok: true };
    }

    return state.setLineItemQuantity(productId, line.quantity - 1);
  },
  setLineItemQuantity: (productId, quantity) => {
    const state = get();
    const activeCart = state.carts.find((cart) => cart.id === state.activeCartId);
    const line = activeCart?.lines.find((item) => item.productId === productId);

    if (!line) {
      return { ok: false, message: "Line item not found." };
    }

    const validation = updateLineQuantity(line, quantity);
    if (!validation.ok) {
      return validation;
    }

    set((current) => ({
      carts: current.carts.map((cart) => {
        if (cart.id !== current.activeCartId) {
          return cart;
        }

        return {
          ...cart,
          updatedAt: Date.now(),
          lines: cart.lines.map((item) =>
            item.productId === productId ? { ...item, quantity } : item,
          ),
        };
      }),
    }));

    return { ok: true };
  },
  clearActiveCart: () => {
    set((current) => ({
      carts: current.carts.map((cart) =>
        cart.id === current.activeCartId ? { ...cart, lines: [], updatedAt: Date.now() } : cart,
      ),
    }));
  },
  archiveActiveCart: (meta) => {
    set((current) => {
      const currentCart = current.carts.find((cart) => cart.id === current.activeCartId);
      if (!currentCart) {
        return current;
      }

      const archived = {
        ...currentCart,
        status: "completed" as const,
        saleId: meta?.saleId,
        completedAt: Date.now(),
        updatedAt: Date.now(),
      };

      const remainingActiveCarts = current.carts.filter((cart) => cart.id !== current.activeCartId);

      if (remainingActiveCarts.length > 0) {
        return {
          carts: remainingActiveCarts,
          archivedCarts: [archived, ...current.archivedCarts],
          activeCartId: remainingActiveCarts[0].id,
        };
      }

      const replacement = createEmptyCart(
        `Client ${current.archivedCarts.length + remainingActiveCarts.length + 2}`,
      );

      return {
        carts: [replacement],
        archivedCarts: [archived, ...current.archivedCarts],
        activeCartId: replacement.id,
      };
    });
  },
}));
