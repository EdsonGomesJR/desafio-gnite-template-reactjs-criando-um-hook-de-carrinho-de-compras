import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      //Para não refletir no state de cart
      const updatedCart = [...cart];
      //Verifica se o prod exists, pelo id do prouduto e comparando ao id da função
      const productExists = updatedCart.find(
        (product) => product.id === productId
      );
      //Passa o productID como parametro na rota, pois o JSON server entende e retorna o stock mediante ao id passado
      const stock = await api.get(`/stock/${productId}`);
      const stockAmount = stock.data.amount;
      //se o produto existe pega o amounte dele, se não retrona o 0
      const currentAmount = productExists ? productExists.amount : 0;
      // esse aumount é a quantidade desejada.
      const amount = currentAmount + 1;
      //se a quantidade desejada for maior que a quantidade no stock
      if (amount > stockAmount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }
      if (productExists) {
        //se existir atualiza a quantidade do produto.
        productExists.amount = amount;
      } else {
        //se for um produto novo, busca na api
        const product = await api.get(`/products/${productId}`);
        //pegar os dados do produto, e na primeira vez que é adicionado, o campo amount será criado no carrinho com o valor: 1
        const newProduct = {
          ...product.data,
          amount: 1,
        };
        updatedCart.push(newProduct);
      }
      setCart(updatedCart);
      //setar para o tempCart ir para o localstorage..pois se setar o cart aqui só atualizara quando tiver uma nova renderização
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const findProduct = cart.find((product) => product.id === productId);

      if (!findProduct) {
        toast.error("Erro na remoção do produto");
        return;
      }

      const removeProduct = cart.filter((product) => product.id !== productId);

      setCart(removeProduct);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(removeProduct));
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      //se a quantidade for menor ou igual a 0 já sai da função
      if (amount <= 0) return;

      //verificar a situação do stock
      const stock = await api.get(`/stock/${productId}`);
      const stockAmount = stock.data.amount;
      //verifica se a qntd desejada é maior que tem no stock
      if (amount > stockAmount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }
      const updatedCart = [...cart];
      //verifica se o produto existe
      const productExists = updatedCart.find(
        (product) => product.id === productId
      );

      if (productExists) {
        //se existir o amount desse produto (productExists) será o amount desejado, passado pela func
        productExists.amount = amount;
        setCart(updatedCart);
        //verifica se a qntd desejada é maior que tem no stock

        localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
      } else {
        /*Como é uma função de incremento de algo que existe se não existir, manda
        direto para o catch*/
        throw Error();
      }
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
