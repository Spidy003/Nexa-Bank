import React, { useState } from 'react';
import { User, CreditCard, Calendar, Lock } from 'lucide-react';
import '../styles/CardPayment.css';

interface InteractiveCardProps {
  onSubmit: (cardData: string) => void;
  initialData?: {
    name?: string;
    number?: string;
    expiry?: string;
    cvv?: string;
  };
  readOnly?: boolean;
  activeField?: string;
}

const InteractiveCard: React.FC<InteractiveCardProps> = ({ onSubmit, initialData, readOnly = false, activeField }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [number, setNumber] = useState(initialData?.number || '');
  const [expiry, setExpiry] = useState(initialData?.expiry || '');
  const [cvv, setCvv] = useState(initialData?.cvv || '');
  const [isFlipped, setIsFlipped] = useState(false);

  // Auto-flip for CVV
  React.useEffect(() => {
    if (activeField === 'cvv' || activeField === 'cardDetails') {
       // if we are on cardDetails, we likely need both but let's see. 
       // Often expiry is front, CVV is back.
    }
  }, [activeField]);

  const getCardType = (num: string) => {
    if (num.startsWith('4')) return 'visa';
    if (num.startsWith('51') || num.startsWith('55') || num.startsWith('5')) return 'mastercard';
    if (num.startsWith('60') || num.startsWith('65') || num.startsWith('6')) return 'rupay';
    return null;
  };

  const cardType = getCardType(number);

  const displayNum = () => {
    if (!number) return '____  ____  ____  ____';
    const padded = number.padEnd(16, '_');
    return `${padded.slice(0,4)}  ${padded.slice(4,8)}  ${padded.slice(8,12)}  ${padded.slice(12,16)}`;
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (activeField === 'cardNumber') onSubmit(number);
    else if (activeField === 'cardName') onSubmit(name);
    else if (activeField === 'cardDetails') onSubmit(`Expiry: ${expiry}, CVV: ${cvv}`);
    else onSubmit(`My card name is ${name}, number is ${number}, expiry is ${expiry}, and CVV is ${cvv}.`);
  };

  return (
    <div className="w-full relative mt-16 mb-6">
      <div className={`c3d-card ${isFlipped ? 'flip' : ''}`}>
        <div className="c3d-card-main-content">
          <div className="c3d-card-front">
            <img className="c3d-card-design-img" src="/card-images/world_map-removebg-preview.png" alt="" />
            <img className="c3d-card-chip-img" src="/card-images/credit_card_chip-removebg-preview.png" alt="" />
            
            <img className="c3d-visa-logo" src="/card-images/Visa_Inc._logo.svg-removebg-preview.png" style={{ display: cardType === 'visa' ? 'block' : 'none' }} alt="" />
            <img className="c3d-master-card-logo" src="/card-images/master-card-logo-removebg-preview.png" style={{ display: cardType === 'mastercard' ? 'block' : 'none' }} alt="" />
            <img className="c3d-rupay-logo" src="/card-images/rupay_logo.png" style={{ display: cardType === 'rupay' ? 'block' : 'none' }} alt="" />
            
            <p className="c3d-card-num">{displayNum()}</p>
            
            <div className="c3d-card-holder-name">
              <h4>Card Holder</h4>
              <h3>{name || '________________'}</h3>
            </div>
            <div className="c3d-card-expires">
              <h4>Valid till</h4>
              <h3>{expiry || '__ /__'}</h3>
            </div>
          </div>
          
          <div className="c3d-card-back">
            <img className="c3d-card-design-img" src="/card-images/world_map-removebg-preview.png" alt="" />
            <div className="c3d-barcode"></div>
            <div className="c3d-card-cvv-wrapper"></div>
            <div className="c3d-card-cvv">
              <h5>{cvv || '____'}</h5>
            </div>
            <div className="c3d-card-back-text">
              <p>Recheck your card details for a hassle-free digital transaction.</p>
            </div>
            <img className="c3d-visa-logo" src="/card-images/Visa_Inc._logo.svg-removebg-preview.png" style={{ display: cardType === 'visa' ? 'block' : 'none' }} alt="" />
            <img className="c3d-master-card-logo" src="/card-images/master-card-logo-removebg-preview.png" style={{ display: cardType === 'mastercard' ? 'block' : 'none' }} alt="" />
            <img className="c3d-rupay-logo" src="/card-images/rupay_logo.png" style={{ display: cardType === 'rupay' ? 'block' : 'none' }} alt="" />
          </div>
        </div>
      </div>
      
      {!readOnly && (
        <div className="c3d-payment-form">
          <form onSubmit={handleSubmit} autoComplete="off">
            
            {(activeField === 'cardName' || !activeField) && (
              <div onClick={() => setIsFlipped(false)}>
                <User className="w-5 h-5 text-cyan-400 opacity-70" />
                <input 
                  type="text" 
                  placeholder="Cardholder Name" 
                  value={name} 
                  onChange={(e) => setName(e.target.value.toUpperCase())}
                  onFocus={() => setIsFlipped(false)}
                />
              </div>
            )}
            
            {(activeField === 'cardNumber' || activeField === 'accountNumber' || activeField === 'ftBeneficiaryAccount' || !activeField) && (
              <div onClick={() => setIsFlipped(false)}>
                <CreditCard className="w-5 h-5 text-cyan-400 opacity-70" />
                <input 
                  type="text" 
                  placeholder="Card Number" 
                  maxLength={16}
                  value={number} 
                  onChange={(e) => setNumber(e.target.value.replace(/\D/g, ''))}
                  onFocus={() => setIsFlipped(false)}
                />
              </div>
            )}
            
            {(activeField === 'cardDetails' || !activeField) && (
              <div className="c3d-input-wrapper">
                <div onClick={() => setIsFlipped(false)}>
                  <Calendar className="w-5 h-5 text-cyan-400 opacity-70" />
                  <input 
                    type="text" 
                    placeholder="MM/YY" 
                    maxLength={5}
                    value={expiry} 
                    onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, '');
                      if (val.length >= 2) val = val.slice(0,2) + '/' + val.slice(2);
                      setExpiry(val);
                    }}
                    onFocus={() => setIsFlipped(false)}
                  />
                </div>
                
                <div className="c3d-card-cvv-field" onClick={() => setIsFlipped(true)}>
                  <Lock className="w-5 h-5 text-cyan-400 opacity-70" />
                  <input 
                    type="password" 
                    placeholder="CVV" 
                    maxLength={3}
                    value={cvv} 
                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                    onFocus={() => setIsFlipped(true)}
                  />
                </div>
              </div>
            )}
            
            <button type="submit" className="c3d-payment-btn">
              <span>Continue</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default InteractiveCard;
