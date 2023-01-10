import { useState, useContext } from 'react';
import { MainContext } from '../context';
import { APP_NAME, tagSelectOptions } from '../utils';
import { useRouter } from 'next/router';
import { css } from '@emotion/css';
import { utils } from 'ethers';
import BigNumber from 'bignumber.js';
import Select from 'react-select';

const supportedCurrencies = {
  matic: 'matic',
  ethereum: 'ethereum',
  avalanche: 'avalanche',
  bnb: 'bnb',
  arbitrum: 'arbitrum',
};

const currencyOptions = Object.keys(supportedCurrencies).map((v) => {
  return {
    value: v,
    label: v,
  };
});

export default function Profile() {
  const {
    balance,
    bundlrInstance,
    fetchBalance,
    initialiseBundlr,
    currency,
    setCurrency,
  } = useContext(MainContext);
  const [file, setFile] = useState();
  const [localVideo, setLocalVideo] = useState();
  const [title, setTitle] = useState('');
  const [fileCost, setFileCost] = useState();
  const [description, setDescription] = useState('');
  const [tagSelectState, setTagSelectState] = useState();
  const router = useRouter();

  const [URI, setURI] = useState();
  const [amount, setAmount] = useState();

  async function fundWallet() {
    if (!amount) return;
    const amountParsed = parseInput(amount);
    try {
      await bundlrInstance.fund(amountParsed);
      fetchBalance();
    } catch (err) {
      console.log('Error funding wallet: ', err);
    }
  }

  function parseInput(input) {
    const conv = new BigNumber(input).multipliedBy(
      bundlrInstance.currencyConfig.base[1]
    );
    if (conv.isLessThan(1)) {
      console.log('error: value too small');
      return;
    } else {
      return conv;
    }
  }

  function onFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    checkUploadCost(file.size);
    if (file) {
      const video = URL.createObjectURL(file);
      setLocalVideo(video);
      let reader = new FileReader();
      reader.onload = function (e) {
        if (reader.result) {
          setFile(Buffer.from(reader.result));
        }
      };
      reader.readAsArrayBuffer(file);
    }
  }

  async function checkUploadCost(bytes) {
    if (bytes) {
      const cost = await bundlrInstance.getPrice(bytes);
      setFileCost(utils.formatEther(cost.toString()));
    }
  }

  async function uploadFile() {
    if (!file) return;
    const tags = [{ name: 'Content-Type', value: 'video/mp4' }];
    try {
      let tx = await bundlrInstance.uploader.upload(file, tags);
      setURI(`http://arweave.net/${tx.data.id}`);
    } catch (err) {
      console.log('Error uploading video: ', err);
    }
  }

  async function saveVideo() {
    if (!file || !title || !description) return;
    const tags = [
      { name: 'Content-Type', value: 'text/plain' },
      { name: 'App-Name', value: APP_NAME },
    ];

    if (tagSelectState) {
      tags.push({
        name: 'Topic',
        value: tagSelectState.value,
      });
    }

    const video = {
      title,
      description,
      URI,
      createdAt: new Date(),
      createdBy: bundlrInstance.address,
    };

    try {
      let tx = await bundlrInstance.createTransaction(JSON.stringify(video), {
        tags,
      });
      await tx.sign();
      const { data } = await tx.upload();

      console.log(`http://arweave.net/${data.id}`);
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (err) {
      console.log('error uploading video with metadata: ', err);
    }
  }

  if (!bundlrInstance) {
    return (
      <div>
        <div className={selectContainerStyle}>
          <Select
            onChange={({ value }) => setCurrency(value)}
            options={currencyOptions}
            defaultValue={{ value: currency, label: currency }}
            classNamePrefix="select"
            instanceId="currency"
          />
          <p>Currency: {currency}</p>
        </div>
        <div className={containerStyle}>
          <button className={wideButtonStyle} onClick={initialiseBundlr}>
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 className={balanceStyle}>
        💰 Balance {Math.round(balance * 100) / 100}
      </h3>
      <div className={formStyle}>
        <p className={labelStyle}>Add Video</p>
        <div className={inputContainerStyle}>
          <input type="file" onChange={onFileChange} />
        </div>
        {localVideo && (
          <video key={localVideo} width="520" controls className={videoStyle}>
            <source src={localVideo} type="video/mp4" />
          </video>
        )}
        {fileCost && (
          <h4>Cost to upload: {Math.round(fileCost * 1000) / 1000} MATIC</h4>
        )}
        <button className={buttonStyle} onClick={uploadFile}>
          Upload Video
        </button>
        {URI && (
          <div>
            <p className={linkStyle}>
              <a href={URI}>{URI}</a>
            </p>
            <div className={formStyle}>
              <p className={labelStyle}>Tag (optional)</p>
              <Select
                options={tagSelectOptions}
                className={selectStyle}
                onChange={(data) => setTagSelectState(data)}
                isClearable
              />
              <p className={labelStyle}>Title</p>
              <input
                className={inputStyle}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Video title"
              />
              <p className={labelStyle}>Description</p>
              <textarea
                placeholder="Video description"
                onChange={(e) => setDescription(e.target.value)}
                className={textAreaStyle}
              />
              <button className={saveVideoButtonStyle} onClick={saveVideo}>
                Save Video
              </button>
            </div>
          </div>
        )}
      </div>
      <div className={bottomFormStyle}>
        <p className={labelStyle}>Fund Wallet</p>
        <input
          placeholder="amount"
          className={inputStyle}
          onChange={(e) => setAmount(e.target.value)}
        />
        <button className={buttonStyle} onClick={fundWallet}>
          Send transaction
        </button>
      </div>
    </div>
  );
}

const selectStyle = css`
  margin-bottom: 20px;
  min-width: 400px;
  border-color: red;
`;

const selectContainerStyle = css`
  margin: 10px 0px 20px;
`;

const linkStyle = css`
  margin: 15px 0px;
`;

const containerStyle = css`
  padding: 10px 20px;
  display: flex;
  justify-content: center;
`;

const inputContainerStyle = css`
  margin: 0px 0px 15px;
`;

const videoStyle = css`
  margin-bottom: 20px;
`;

const formStyle = css`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 20px 0px 0px;
`;

const bottomFormStyle = css`
  ${formStyle};
  margin-top: 35px;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
`;

const labelStyle = css`
  margin: 0px 0px 5px;
`;

const inputStyle = css`
  padding: 12px 20px;
  border-radius: 5px;
  border: none;
  outline: none;
  background-color: rgba(0, 0, 0, 0.08);
  margin-bottom: 15px;
`;

const textAreaStyle = css`
  ${inputStyle};
  width: 350px;
  height: 90px;
`;

const buttonStyle = css`
  background-color: black;
  color: white;
  padding: 12px 40px;
  border-radius: 50px;
  font-weight: 700;
  width: 180;
  transition: all 0.35s;
  cursor: pointer;
  &:hover {
    background-color: rgba(0, 0, 0, 0.75);
  }
`;

const saveVideoButtonStyle = css`
  ${buttonStyle};
  margin-top: 15px;
`;

const wideButtonStyle = css`
  ${buttonStyle};
  width: 380px;
`;

const balanceStyle = css`
  padding: 10px 25px;
  background-color: rgba(0, 0, 0, 0.08);
  border-radius: 30px;
  display: inline-block;
  width: 200px;
  text-align: center;
`;
